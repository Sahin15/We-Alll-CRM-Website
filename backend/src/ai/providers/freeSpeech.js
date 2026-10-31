import { AiAccessError } from '../aiErrors.js';

const VOICES = {
  en: 'en-IN',
  hi: 'hi',
  bn: 'bn',
};

/**
 * Split a reply into pieces the free voice service can speak.
 * @param {string} text
 * @returns {string[]}
 */
export function speechPieces(text) {
  const spoken = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!spoken) return [];
  const sentences = spoken.match(/[^.!?।]+[.!?।]?/g) || [spoken];
  const pieces = [];
  let current = '';
  for (const sentence of sentences) {
    const next = `${current}${sentence}`.trim();
    if (next.length > 160 && current) {
      pieces.push(current.trim());
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces.flatMap((piece) => {
    if (piece.length <= 160) return [piece];
    const bits = [];
    for (let index = 0; index < piece.length; index += 160) {
      bits.push(piece.slice(index, index + 160));
    }
    return bits;
  });
}

/**
 * @param {string} text
 * @param {string} language
 */
export function speechRequest(text, language) {
  const lang = language === 'hi' || language === 'bn' ? language : 'en';
  return {
    voice: VOICES[lang],
    text: String(text || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
    pieces: speechPieces(text),
  };
}

/**
 * Download MP3 audio from the free online voice. No API key is used.
 * @param {{ pieces: string[], voice: string }} request
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Buffer>}
 */
async function speakWithFreeVoice(request, fetchImpl = fetch) {
  const parts = [];
  for (const piece of request.pieces) {
    const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${encodeURIComponent(request.voice)}&q=${encodeURIComponent(piece)}`;
    const response = await fetchImpl(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'audio/mpeg',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new AiAccessError(503, 'Natural voice is unavailable.');
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length < 100) {
      throw new AiAccessError(503, 'Natural voice is unavailable.');
    }
    parts.push(audio);
  }
  return Buffer.concat(parts);
}

/**
 * Free spoken audio for English, Hindi, and Bengali.
 * @param {string} text
 * @param {string} language
 * @param {(request: { voice: string, text: string, pieces: string[] }) => Promise<Buffer>} [connect]
 * @returns {Promise<Buffer>}
 */
export async function synthesizeFreeSpeech(text, language, connect = (request) => speakWithFreeVoice(request)) {
  const request = speechRequest(text, language);
  if (!request.text) {
    throw new AiAccessError(400, 'Nothing to speak.');
  }
  try {
    const audio = await connect(request);
    if (!audio?.length) {
      throw new AiAccessError(503, 'Natural voice is unavailable.');
    }
    return audio;
  } catch (error) {
    if (error instanceof AiAccessError) throw error;
    throw new AiAccessError(503, 'Natural voice is unavailable.');
  }
}
