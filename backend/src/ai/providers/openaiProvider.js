import { AiAccessError } from '../aiErrors.js';
import { AIRA_SYSTEM_PROMPT } from '../aiPrompts.js';

/**
 * OpenAI chat-completions tool calling. The API key stays in the request header.
 * @param {{ apiKey: string, model: string, fetchImpl?: typeof fetch }} options
 */
export function createOpenAiProvider(options) {
  const fetchImpl = options.fetchImpl || fetch;
  const model = options.model || 'gpt-4o-mini';

  return {
    id: 'openai',
    /**
     * @param {{ message: string, language: string, tools: object[], history?: Array<{ role?: string, text?: string }> }} input
     * @returns {Promise<{ name: string, args: object } | null>}
     */
    async chooseTool(input) {
      const earlier = (input.history || [])
        .filter((item) => item?.role === 'user' && typeof item.text === 'string' && item.text.trim())
        .slice(-4)
        .map((item) => ({ role: 'user', content: item.text.trim().slice(0, 300) }));
      const response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: AIRA_SYSTEM_PROMPT },
            ...earlier,
            { role: 'user', content: String(input.message || '').slice(0, 500) },
          ],
          tools: input.tools,
          tool_choice: 'auto',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return parseToolChoice(data);
    },
  };
}

/**
 * @param {object} data
 * @returns {{ name: string, args: object } | null}
 */
export function parseToolChoice(data) {
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.name) return null;

  let args = {};
  if (call.function.arguments) {
    try {
      args = JSON.parse(call.function.arguments);
    } catch {
      throw new AiAccessError(400, 'Invalid AI tool request');
    }
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new AiAccessError(400, 'Invalid AI tool request');
  }
  return { name: call.function.name, args };
}

/**
 * @returns {ReturnType<typeof createOpenAiProvider> | null}
 */
export function getConfiguredProvider() {
  const name = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (name !== 'openai') return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAiProvider({
    apiKey,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
}
