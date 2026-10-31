import { useEffect, useRef, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import {
  FaMicrophone,
  FaPaperPlane,
  FaPlus,
  FaRobot,
  FaSlidersH,
  FaTimes,
} from "react-icons/fa";
import { sendAiraMessage } from "../../api/aiApi";
import { browserVoiceProvider, preferFemaleVoice } from "../../services/voice/browserVoiceProvider";
import "./AiraAssistant.css";

const LANGUAGE_KEY = "aira.language";
const VOICE_KEY = "aira.voiceURI";
const SPEAK_KEY = "aira.voiceEnabled";
const MESSAGES_KEY = "aira.messages";
const CONVERSATIONS_KEY = "aira.conversations";
const MAX_MESSAGES = 40;

const LANGUAGES = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
];

const STARTERS = [
  "Give me the attendance report",
  "Who is late, absent, or on leave today?",
  "Morning brief",
  "What is my leave balance?",
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode can block storage. The current session still works.
  }
}

function loadMessages() {
  try {
    const parsed = JSON.parse(readStorage(MESSAGES_KEY, ""));
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && item.role && item.text).slice(-MAX_MESSAGES);
    }
  } catch {
    // Fall through to the older conversation list.
  }
  try {
    const parsed = JSON.parse(readStorage(CONVERSATIONS_KEY, "[]"));
    const first = Array.isArray(parsed) ? parsed.find((item) => Array.isArray(item?.messages)) : null;
    return (first?.messages || []).filter((item) => item && item.role && item.text).slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function speechLanguage(selected) {
  if (selected === "hi" || selected === "bn" || selected === "en") return selected;
  const browserLang = (navigator.language || "").toLowerCase();
  if (browserLang.startsWith("hi")) return "hi";
  if (browserLang.startsWith("bn")) return "bn";
  return "en";
}

function voiceErrorText(error) {
  const code = error?.error || error?.name || "";
  if (code === "not-allowed" || code === "service-not-allowed") {
    return "Microphone permission was blocked.";
  }
  if (code === "unsupported" || code === "audio-capture") {
    return "Voice input is not available in this browser.";
  }
  return "";
}

/**
 * Use a saved voice when the person chose one. Otherwise use a female voice
 * for the reply language.
 * @param {Array<{ id: string, lang: string, label?: string }>} voices
 * @param {string} preferredId
 * @param {string} lang
 */
function pickVoiceId(voices, preferredId, lang) {
  if (preferredId && voices.some((voice) => voice.id === preferredId)) return preferredId;
  return preferFemaleVoice(voices, lang);
}

/**
 * Floating Nova chat. The microphone opens a spoken conversation:
 * speech is sent when the user pauses, and the reply is spoken back.
 * @param {{ bottomOffset?: number }} props
 */
export default function AiraAssistant({ bottomOffset = 24 }) { // eslint-disable-line react/prop-types
  const [open, setOpen] = useState(false);
  const [talking, setTalking] = useState(false);
  const [phase, setPhase] = useState("listening");
  const [liveCaption, setLiveCaption] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(loadMessages);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(() => readStorage(LANGUAGE_KEY, "auto"));
  const [speakReplies, setSpeakReplies] = useState(() => readStorage(SPEAK_KEY, "false") === "true");
  const [voices, setVoices] = useState([]);
  const [naturalVoice, setNaturalVoice] = useState(false);
  const [voiceId, setVoiceId] = useState(() => readStorage(VOICE_KEY, ""));
  const listRef = useRef(null);
  const messagesRef = useRef(messages);
  const heardRef = useRef("");
  const talkActiveRef = useRef(false);
  const listenGeneration = useRef(0);
  const speakGeneration = useRef(0);
  const pendingRef = useRef(false);
  const languageRef = useRef(language);
  const voicesRef = useRef(voices);
  const voiceIdRef = useRef(voiceId);
  const speakRepliesRef = useRef(speakReplies);
  const lastSpokenRef = useRef("");
  const sendTextRef = useRef(null);
  const listenRef = useRef(null);
  const inputSupported = browserVoiceProvider.isInputSupported();
  const outputSupported = browserVoiceProvider.isOutputSupported();

  messagesRef.current = messages;
  languageRef.current = language;
  voicesRef.current = voices;
  voiceIdRef.current = voiceId;
  speakRepliesRef.current = speakReplies;
  pendingRef.current = pending;

  useEffect(() => {
    writeStorage(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!open || !outputSupported) return undefined;
    return browserVoiceProvider.onVoicesChanged(setVoices);
  }, [open, outputSupported]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    browserVoiceProvider.prepare().then((enabled) => {
      if (alive) setNaturalVoice(Boolean(enabled));
    });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!listRef.current || talking) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, pending, open, talking]);

  const stopVoice = () => {
    talkActiveRef.current = false;
    listenGeneration.current += 1;
    speakGeneration.current += 1;
    browserVoiceProvider.stopListening();
    browserVoiceProvider.cancel();
    setTalking(false);
    setLiveCaption("");
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      talkActiveRef.current = false;
      listenGeneration.current += 1;
      speakGeneration.current += 1;
      browserVoiceProvider.stopListening();
      browserVoiceProvider.cancel();
      setTalking(false);
      setLiveCaption("");
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const closePanel = () => {
    stopVoice();
    setOpen(false);
  };

  const changeLanguage = (value) => {
    setLanguage(value);
    writeStorage(LANGUAGE_KEY, value);
  };

  const changeVoice = (value) => {
    setVoiceId(value);
    writeStorage(VOICE_KEY, value);
  };

  const changeSpeak = (checked) => {
    setSpeakReplies(checked);
    writeStorage(SPEAK_KEY, checked ? "true" : "false");
    if (!checked && !talkActiveRef.current) browserVoiceProvider.cancel();
  };

  const startNewChat = () => {
    if (talkActiveRef.current) return;
    setMessages([]);
    setDraft("");
    setStatus("");
  };

  const listen = () => {
    if (!talkActiveRef.current || pendingRef.current) return;
    const generation = listenGeneration.current + 1;
    listenGeneration.current = generation;
    heardRef.current = "";
    setPhase("listening");
    setLiveCaption("");
    setStatus("");
    browserVoiceProvider.startListening({
      lang: speechLanguage(languageRef.current),
      onResult: (text) => {
        if (listenGeneration.current !== generation || !talkActiveRef.current) return;
        heardRef.current = text;
        setLiveCaption(text);
      },
      onError: (error) => {
        if (listenGeneration.current !== generation) return;
        const code = error?.error || error?.name || "";
        if (code === "no-speech" || code === "aborted") return;
        talkActiveRef.current = false;
        setTalking(false);
        setStatus(voiceErrorText(error) || "Voice input stopped. You can still type your message.");
      },
      onEnd: () => {
        if (listenGeneration.current !== generation || !talkActiveRef.current) return;
        const text = heardRef.current.trim();
        heardRef.current = "";
        const echo = lastSpokenRef.current.trim().toLowerCase();
        if (text && text.toLowerCase() !== echo) {
          sendTextRef.current?.(text, { voice: true });
          return;
        }
        listenRef.current?.();
      },
    });
  };
  listenRef.current = listen;

  const resumeAfterSpeech = (generation) => {
    window.setTimeout(() => {
      if (!talkActiveRef.current || speakGeneration.current !== generation) return;
      listenRef.current?.();
    }, 700);
  };

  const sendText = async (rawText, options = {}) => {
    const voiceTurn = Boolean(options.voice);
    const message = String(rawText || "").trim();
    if (!message || pendingRef.current) return;
    if (!voiceTurn) {
      browserVoiceProvider.stopListening();
    }
    setDraft("");
    setStatus("");
    setLiveCaption("");
    if (voiceTurn) setPhase("thinking");
    pendingRef.current = true;
    setPending(true);
    const history = messagesRef.current
      .filter((item) => item.role === "user" && item.text)
      .slice(-4)
      .map((item) => ({ role: "user", text: String(item.text).slice(0, 300) }));
    setMessages((current) => [...current, { role: "user", text: message }].slice(-MAX_MESSAGES));

    let reply = "";
    let replyLanguage = speechLanguage(languageRef.current);
    let failed = false;
    try {
      const response = await sendAiraMessage(message.slice(0, 500), languageRef.current, history);
      reply = response?.data?.message || "Nova did not return a reply.";
      replyLanguage = response?.data?.language || replyLanguage;
      setMessages((current) => [...current, { role: "assistant", text: reply }].slice(-MAX_MESSAGES));
    } catch (error) {
      failed = true;
      const text = error?.response?.data?.error
        || error?.response?.data?.message
        || "Nova could not complete that request.";
      setMessages((current) => [...current, { role: "assistant", text, error: true }].slice(-MAX_MESSAGES));
    } finally {
      pendingRef.current = false;
      setPending(false);
    }

    if (voiceTurn && !talkActiveRef.current) return;
    if (failed) {
      if (voiceTurn) listenRef.current?.();
      return;
    }
    const shouldSpeak = voiceTurn || speakRepliesRef.current;
    if (shouldSpeak && outputSupported && reply) {
      const generation = speakGeneration.current + 1;
      speakGeneration.current = generation;
      if (voiceTurn && talkActiveRef.current) {
        lastSpokenRef.current = reply;
        setPhase("speaking");
      }
      browserVoiceProvider.speak(
        reply,
        pickVoiceId(voicesRef.current, voiceIdRef.current, replyLanguage),
        () => resumeAfterSpeech(generation),
        replyLanguage,
      );
      return;
    }
    if (voiceTurn && talkActiveRef.current) listenRef.current?.();
  };
  sendTextRef.current = sendText;

  const beginTalk = () => {
    if (!inputSupported || pendingRef.current) return;
    setStatus("");
    talkActiveRef.current = true;
    setTalking(true);
    listen();
  };

  const onOrbClick = () => {
    if (!talkActiveRef.current) return;
    if (phase === "speaking") {
      speakGeneration.current += 1;
      browserVoiceProvider.cancel();
      listen();
      return;
    }
    if (phase === "listening") {
      const text = heardRef.current.trim();
      listenGeneration.current += 1;
      browserVoiceProvider.stopListening();
      if (text) sendText(text, { voice: true });
      else listen();
    }
  };

  const savedVoiceMissing = voiceId && !voices.some((voice) => voice.id === voiceId);
  const selectedVoiceId = pickVoiceId(voices, voiceId, speechLanguage(language));
  const talkStatus = phase === "speaking"
    ? "Speaking"
    : phase === "thinking"
      ? "Thinking"
      : "Listening";
  const latestLine = messages[messages.length - 1]?.text || "";
  const caption = phase === "listening"
    ? (liveCaption || latestLine || "Speak naturally. Nova answers when you pause.")
    : (latestLine || "Looking that up…");

  return (
    <>
      <button
        type="button"
        className="aira-launch"
        style={{ bottom: bottomOffset }}
        aria-label={open ? "Close Nova" : "Open Nova"}
        onClick={() => (open ? closePanel() : setOpen(true))}
      >
        <FaRobot />
      </button>

      {open && (
        <section
          className="aira-panel"
          style={{
            bottom: bottomOffset + 68,
            maxHeight: `min(640px, calc(100dvh - ${bottomOffset + 84}px))`,
          }}
          role="dialog"
          aria-label="Nova assistant"
        >
          <header className="aira-header">
            <div>
              <h2>Nova</h2>
              <p>{talking ? "Voice conversation" : "Workplace assistant"}</p>
            </div>
            <div className="aira-header-actions">
              {!talking && (
                <button type="button" aria-label="New chat" title="New chat" onClick={startNewChat}>
                  <FaPlus />
                </button>
              )}
              <button type="button" aria-label="Close Nova panel" onClick={closePanel}>
                <FaTimes />
              </button>
            </div>
          </header>

          {talking ? (
            <div className="aira-talk">
              <button
                type="button"
                className={`aira-orb is-${phase}`}
                aria-label={phase === "speaking" ? "Interrupt and listen" : "Nova is listening"}
                disabled={phase === "thinking"}
                onClick={onOrbClick}
              >
                {phase === "thinking" ? <Spinner animation="border" /> : <FaMicrophone />}
              </button>
              <p className="aira-talk-status">{talkStatus}</p>
              <p className="aira-caption">{caption}</p>
              <button type="button" className="aira-end" onClick={stopVoice}>
                End
              </button>
            </div>
          ) : (
            <>
              <div className="aira-messages" ref={listRef} role="log" aria-live="polite">
                {messages.length === 0 && (
                  <div className="aira-empty">
                    <div className="aira-suggestions">
                      {STARTERS.map((prompt) => (
                        <button key={prompt} type="button" onClick={() => sendText(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`aira-turn ${item.role}`}
                  >
                    <span className="aira-who">{item.role === "user" ? "You" : "Nova"}</span>
                    <div className={`aira-bubble ${item.role}${item.error ? " error" : ""}`}>
                      {item.text}
                    </div>
                  </div>
                ))}
                {pending && (
                  <div className="aira-turn assistant">
                    <span className="aira-who">Nova</span>
                    <div className="aira-bubble assistant aira-typing">
                      <Spinner animation="border" size="sm" />
                      Looking that up…
                    </div>
                  </div>
                )}
              </div>

              <div className="aira-composer">
                {savedVoiceMissing && (
                  <p className="aira-status">Saved voice is not available on this device. Choose another voice.</p>
                )}
                {status && <p className="aira-status">{status}</p>}
                <div className="aira-composer-box">
                  <Form.Control
                    as="textarea"
                    rows={1}
                    maxLength={500}
                    value={draft}
                    placeholder="Message Nova"
                    aria-label="Message Nova"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendText(draft);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="aira-icon-btn aira-talk-btn"
                    aria-label="Talk to Nova"
                    disabled={!inputSupported || pending}
                    title={inputSupported ? "Talk to Nova" : "Voice input is not supported in this browser"}
                    onClick={beginTalk}
                  >
                    <FaMicrophone />
                  </button>
                  <button
                    type="button"
                    className="aira-icon-btn aira-send"
                    aria-label="Send"
                    disabled={pending || !draft.trim()}
                    onClick={() => sendText(draft)}
                  >
                    <FaPaperPlane />
                  </button>
                </div>
                <button
                  type="button"
                  className="aira-settings-toggle"
                  aria-expanded={showSettings}
                  onClick={() => setShowSettings((current) => !current)}
                >
                  <FaSlidersH aria-hidden="true" />
                  Voice and language
                </button>
                {showSettings && (
                  <div className="aira-toolbar">
                    <label>
                      Language
                      <Form.Select
                        size="sm"
                        value={language}
                        aria-label="Nova language"
                        onChange={(event) => changeLanguage(event.target.value)}
                      >
                        {LANGUAGES.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </Form.Select>
                    </label>
                    {naturalVoice ? (
                      <p className="aira-status">Nova uses a natural speaking voice.</p>
                    ) : (
                      <label>
                        Voice
                        <Form.Select
                          size="sm"
                          value={selectedVoiceId}
                          aria-label="Nova voice"
                          disabled={!outputSupported || voices.length === 0}
                          onChange={(event) => changeVoice(event.target.value)}
                        >
                          {voices.length === 0 && (
                            <option value="">{outputSupported ? "Default voice" : "Voice output unavailable"}</option>
                          )}
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>{voice.label}</option>
                          ))}
                        </Form.Select>
                      </label>
                    )}
                    <label className="aira-voice-toggle">
                      <Form.Check
                        type="switch"
                        id="aira-speak-replies"
                        checked={speakReplies}
                        disabled={!outputSupported && !naturalVoice}
                        onChange={(event) => changeSpeak(event.target.checked)}
                        label="Read typed replies aloud"
                      />
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
