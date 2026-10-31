import api from "../services/api";

/**
 * @param {string} message
 * @param {'auto'|'en'|'hi'|'bn'} language
 * @param {Array<{ role: string, text: string }>} [history]
 */
export function sendAiraMessage(message, language, history) {
  return api.post("/ai/chat", {
    message,
    language,
    ...(history?.length ? { history } : {}),
  });
}

/**
 * @returns {Promise<boolean>}
 */
export async function naturalVoiceAvailable() {
  try {
    const response = await api.get("/ai/voice");
    return Boolean(response?.data?.natural);
  } catch {
    return false;
  }
}

/**
 * @param {string} text
 * @param {string} language
 * @returns {Promise<Blob|null>}
 */
export async function fetchNovaSpeech(text, language) {
  const response = await api.post("/ai/speech", { text, language }, {
    responseType: "blob",
    validateStatus: () => true,
  });
  const type = String(response?.headers?.["content-type"] || "");
  if (response.status !== 200 || !type.includes("audio")) return null;
  return response.data;
}
