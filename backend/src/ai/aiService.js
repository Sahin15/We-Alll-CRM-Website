import logger from '../utils/logger.js';
import { AiAccessError } from './aiErrors.js';
import { TOOL_DEFINITIONS } from './aiPrompts.js';
import { resolveLanguage } from './languageService.js';
import { routeIntent } from './intentRouter.js';
import { expandFollowUp } from './conversationContext.js';
import { isAllowedTool, runTool } from './aiTools.js';
import { formatResult, helpPayload, refusalPayload } from './formatters.js';
import { sanitizePublicText } from './sanitize.js';
import { getConfiguredProvider } from './providers/openaiProvider.js';

/**
 * @param {object} user
 * @param {string} type
 * @param {string} language
 */
function audit(user, type, language) {
  const userId = user?.id || user?._id || 'unknown';
  logger.info(`[aira] user=${userId} type=${type} language=${language}`);
}

/**
 * @param {object} input
 * @param {object} input.user
 * @param {string} input.message
 * @param {string} input.language
 * @param {object|null|undefined} [input.provider]
 * @param {Array<{ role?: string, text?: string }>|undefined} [input.history]
 */
export async function handleChat({ user, message, language, provider, history }) {
  if (!user?._id) {
    throw new AiAccessError(401, 'Authentication required');
  }

  const resolvedLanguage = resolveLanguage(language, message);
  const asked = expandFollowUp(message, history);
  const localChoice = routeIntent(asked);
  if (localChoice?.refused) {
    audit(user, 'refused', resolvedLanguage);
    return {
      success: true,
      message: sanitizePublicText(formatResult(resolvedLanguage, refusalPayload())),
      language: resolvedLanguage,
      data: { type: 'refused' },
    };
  }

  const activeProvider = provider === undefined ? getConfiguredProvider() : provider;
  let choice = null;
  if (activeProvider) {
    try {
      choice = await activeProvider.chooseTool({
        message: asked,
        history,
        language: resolvedLanguage,
        tools: TOOL_DEFINITIONS,
      });
    } catch (error) {
      if (error instanceof AiAccessError) throw error;
      logger.warn('[aira] provider unavailable');
      choice = null;
    }
  }

  if (!choice) choice = localChoice;
  if (!choice?.name) {
    audit(user, 'help', resolvedLanguage);
    return {
      success: true,
      message: sanitizePublicText(formatResult(resolvedLanguage, helpPayload())),
      language: resolvedLanguage,
      data: { type: 'help' },
    };
  }

  if (!isAllowedTool(choice.name)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }

  const payload = await runTool(choice.name, user, choice.args || {});
  audit(user, payload.type, resolvedLanguage);
  return {
    success: true,
    message: sanitizePublicText(formatResult(resolvedLanguage, payload)),
    language: resolvedLanguage,
    data: { type: payload.type },
  };
}
