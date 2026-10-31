import logger from '../utils/logger.js';
import { AiAccessError } from './aiErrors.js';
import { handleChat } from './aiService.js';
import { naturalVoiceConfigured, synthesizeSpeech } from './providers/openaiSpeech.js';

const LANGUAGES = new Set(['auto', 'en', 'hi', 'bn']);

/**
 * Keep only recent user questions. Assistant text is dropped so a reply
 * cannot steer the next tool.
 * @param {object} body
 */
function readHistory(body) {
  if (!Array.isArray(body?.history)) return [];
  const items = [];
  for (const item of body.history.slice(-8)) {
    if (!item || item.role !== 'user' || typeof item.text !== 'string') continue;
    const text = item.text.trim();
    if (!text || text.length > 500) continue;
    items.push({ role: 'user', text: text.slice(0, 300) });
  }
  return items.slice(-4);
}

/**
 * POST /api/ai/chat
 * The user comes from JWT middleware. Body userId and role are ignored.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const chat = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Authentication required',
      });
    }

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message || message.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Enter a message up to 500 characters.',
        message: 'Enter a message up to 500 characters.',
      });
    }

    const requested = req.body?.language;
    const language = LANGUAGES.has(requested) ? requested : 'auto';
    const result = await handleChat({
      user: req.user,
      message,
      language,
      history: readHistory(req.body),
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error instanceof AiAccessError && (error.status === 400 || error.status === 403)
      ? error.status
      : 500;
    const text = status === 500
      ? 'Nova could not complete that request.'
      : error.message;
    if (status === 500) {
      logger.error('[aira] request failed');
    }
    return res.status(status).json({ success: false, error: text, message: text });
  }
};

/**
 * GET /api/ai/voice
 * Tells the browser whether a natural voice is configured. No secret is returned.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const voiceMode = (req, res) => {
  if (!req.user?._id) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Authentication required',
    });
  }
  return res.status(200).json({ success: true, natural: naturalVoiceConfigured() });
};

/**
 * POST /api/ai/speech
 * Returns spoken audio for a Nova reply. The text is not logged.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const speak = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Authentication required',
      });
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 1200) {
      return res.status(400).json({
        success: false,
        error: 'Nothing to speak.',
        message: 'Nothing to speak.',
      });
    }

    const requested = req.body?.language;
    const language = LANGUAGES.has(requested) ? requested : 'en';
    const audio = await synthesizeSpeech(text, language);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (error) {
    const status = error instanceof AiAccessError && (error.status === 400 || error.status === 503)
      ? error.status
      : 503;
    const message = status === 503
      ? 'Natural voice is unavailable.'
      : error.message;
    return res.status(status).json({ success: false, error: message, message });
  }
};
