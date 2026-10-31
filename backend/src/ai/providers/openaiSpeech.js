import { AiAccessError } from '../aiErrors.js';
import { synthesizeFreeSpeech } from './freeSpeech.js';

const TONE = {
  en: 'Speak English in a warm, natural conversational tone, like a colleague sitting beside the listener. Easy pace. Not a loudspeaker or a news reader.',
  hi: 'Speak Hindi in a warm, natural conversational tone, like a colleague sitting beside the listener. Easy pace. Not a loudspeaker.',
  bn: 'Speak Bengali in a warm, natural conversational tone, like a colleague sitting beside the listener. Easy pace. Not a loudspeaker.',
};

/**
 * Natural speech audio. The API key stays in the request header.
 * @param {string} text
 * @param {string} language
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Buffer>}
 */
export async function synthesizeSpeech(text, language, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return synthesizeFreeSpeech(text, language);
  }

  const spoken = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!spoken) {
    throw new AiAccessError(400, 'Nothing to speak.');
  }

  const lang = language === 'hi' || language === 'bn' ? language : 'en';
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const voice = process.env.OPENAI_TTS_VOICE || 'nova';
  const payload = {
    model,
    voice,
    input: spoken,
    instructions: TONE[lang],
  };

  let response = await requestSpeech(fetchImpl, apiKey, payload);
  if (!response.ok) {
    response = await requestSpeech(fetchImpl, apiKey, {
      model: 'tts-1',
      voice: 'nova',
      input: spoken,
    });
  }
  if (!response.ok) {
    return synthesizeFreeSpeech(text, language);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} apiKey
 * @param {object} payload
 */
async function requestSpeech(fetchImpl, apiKey, payload) {
  return fetchImpl('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
}

/**
 * Free neural speech is available without a key. OpenAI is used when a key is set.
 * @returns {boolean}
 */
export function naturalVoiceConfigured() {
  if (process.env.OPENAI_API_KEY) return true;
  return process.env.AI_FREE_VOICE !== 'off';
}
