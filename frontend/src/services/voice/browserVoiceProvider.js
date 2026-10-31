import { fetchNovaSpeech, naturalVoiceAvailable } from "../../api/aiApi";

/**
 * Browser speech, with a natural server voice when one is configured.
 * UI code depends on this object shape so another speech provider can replace it later.
 *
 * @typedef {object} AiraVoice
 * @property {string} id
 * @property {string} label
 * @property {string} lang
 */

const SPEECH_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
};

const FEMALE_VOICE = /female|woman|zira|hazel|heera|neerja|aria|jenny|sonia|libby|natasha|swara|kalpana|nabanita|tanishaa|pallavi|sapna|samantha|victoria|karen|moira|fiona|veena|lekha/i;
const MALE_VOICE = /\bmale\b|\bdavid\b|\bmark\b|\bravi\b|\bguy\b|\bdavis\b|hemant|madhur|prabhat|bashkar/i;

/**
 * Pick a female voice from the device list. Names are matched only to tell
 * female voices apart; the list itself still comes from the browser.
 * @param {Array<{ id?: string, voiceURI?: string, name?: string, label?: string, lang?: string }>} voices
 * @param {string} [lang]
 * @returns {string}
 */
export function preferFemaleVoice(voices, lang) {
  const prefix = lang === 'hi' || lang === 'bn' || lang === 'en' ? lang : 'en';
  let bestId = '';
  let bestScore = 0;
  for (const voice of voices || []) {
    const name = `${voice.name || ''} ${voice.label || ''}`;
    if (!FEMALE_VOICE.test(name) || MALE_VOICE.test(name)) continue;
    const language = String(voice.lang || '').toLowerCase();
    let score = 5;
    if (/natural|neural|online/i.test(name)) score += 8;
    if (language.startsWith(`${prefix}-in`)) score += 3;
    else if (language.startsWith(prefix)) score += 2;
    if (score > bestScore) {
      bestScore = score;
      bestId = voice.voiceURI || voice.id || '';
    }
  }
  return bestId;
}

/**
 * @returns {SpeechRecognition | null}
 */
function recognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * @returns {{
 *   id: string,
 *   isInputSupported: () => boolean,
 *   isOutputSupported: () => boolean,
 *   startListening: (options: object) => void,
 *   stopListening: () => void,
 *   getVoices: () => AiraVoice[],
 *   onVoicesChanged: (callback: (voices: AiraVoice[]) => void) => () => void,
   *   speak: (text: string, voiceId?: string, onEnd?: () => void, lang?: string) => void,
 *   cancel: () => void,
 * }}
 */
export function createBrowserVoiceProvider() {
  let recognition = null;
  let audio = null;
  let audioUrl = '';
  let turn = 0;
  let natural = null;

  function stopAudio() {
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = '';
    }
  }

  function speakWithBrowser(text, voiceId, onEnd, lang, currentTurn) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
      if (currentTurn === turn) onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[lang] || SPEECH_LANG.en;
    utterance.rate = 0.94;
    utterance.pitch = 1.04;
    const available = window.speechSynthesis.getVoices();
    const chosenId = voiceId || preferFemaleVoice(available, lang);
    const match = available.find((voice) => voice.voiceURI === chosenId);
    if (match) utterance.voice = match;
    let finished = false;
    const finish = () => {
      if (finished || currentTurn !== turn) return;
      finished = true;
      onEnd?.();
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  }

  return {
    id: 'browser',
    isInputSupported() {
      return Boolean(recognitionConstructor());
    },
    isOutputSupported() {
      return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
    },
    startListening({ lang, onResult, onError, onEnd }) {
      const Ctor = recognitionConstructor();
      if (!Ctor) {
        onError?.({ error: 'unsupported' });
        return;
      }
      this.stopListening();
      const session = new Ctor();
      recognition = session;
      session.lang = SPEECH_LANG[lang] || SPEECH_LANG.en;
      session.interimResults = true;
      session.continuous = false;
      session.onresult = (event) => {
        let text = '';
        for (let index = 0; index < event.results.length; index += 1) {
          text += event.results[index][0]?.transcript || '';
        }
        const last = event.results[event.results.length - 1];
        onResult?.(text.trim(), Boolean(last?.isFinal));
      };
      session.onerror = (event) => onError?.(event);
      session.onend = () => {
        if (recognition === session) recognition = null;
        onEnd?.();
      };
      try {
        session.start();
      } catch (error) {
        onError?.(error);
      }
    },
    stopListening() {
      try {
        recognition?.stop();
      } catch {
        recognition = null;
      }
    },
    getVoices() {
      if (!this.isOutputSupported()) return [];
      return window.speechSynthesis.getVoices().map((voice) => ({
        id: voice.voiceURI,
        label: `${voice.name} (${voice.lang})`,
        lang: voice.lang,
      }));
    },
    onVoicesChanged(callback) {
      if (!this.isOutputSupported()) return () => {};
      const handler = () => callback(this.getVoices());
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      callback(this.getVoices());
      return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
    },
    async prepare() {
      if (natural !== null) return natural;
      natural = await naturalVoiceAvailable();
      return natural;
    },
    usesNaturalVoice() {
      return natural === true;
    },
    speak(text, voiceId, onEnd, lang) {
      const spoken = String(text || '').trim();
      if (!spoken) {
        onEnd?.();
        return;
      }
      turn += 1;
      const currentTurn = turn;
      stopAudio();
      if (this.isOutputSupported()) window.speechSynthesis.cancel();

      const finish = () => {
        if (currentTurn !== turn) return;
        onEnd?.();
      };

      (async () => {
        const canUseNatural = natural === true || (natural === null && await this.prepare());
        if (currentTurn !== turn) return;
        if (canUseNatural) {
          let blob = null;
          try {
            blob = await fetchNovaSpeech(spoken.slice(0, 1200), lang || 'en');
          } catch {
            blob = null;
          }
          if (currentTurn !== turn) return;
          if (!blob) {
            natural = false;
          } else {
            try {
              audioUrl = URL.createObjectURL(blob);
              audio = new Audio(audioUrl);
              audio.onended = () => {
                stopAudio();
                finish();
              };
              audio.onerror = () => {
                stopAudio();
                speakWithBrowser(spoken, voiceId, onEnd, lang, currentTurn);
              };
              await audio.play();
              return;
            } catch {
              stopAudio();
            }
          }
        }
        if (currentTurn !== turn) return;
        speakWithBrowser(spoken, voiceId, onEnd, lang, currentTurn);
      })();
    },
    cancel() {
      turn += 1;
      stopAudio();
      if (this.isOutputSupported()) window.speechSynthesis.cancel();
    },
  };
}

export const browserVoiceProvider = createBrowserVoiceProvider();
