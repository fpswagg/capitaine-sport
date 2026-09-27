"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

// Customer bot of the business on SSS. The public bot key (cb_…) only reaches
// this bot, so it is safe in the browser (see docs: client-bot.md).
const API_URL = process.env.NEXT_PUBLIC_SSS_API_URL?.replace(/\/+$/, "");
const BOT_KEY = process.env.NEXT_PUBLIC_SSS_BOT_KEY;
const BOT_BASE = API_URL && BOT_KEY ? `${API_URL}/api/v1/bot/${encodeURIComponent(BOT_KEY)}` : null;

const VISITOR_STORAGE_KEY = "cs-chat-visitor";
const SEEN_STORAGE_KEY = "cs-chat-seen";
export const OPEN_CHAT_EVENT = "cs-chat:open";

type BotFile = { url: string; name?: string; mediaType?: string };
type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  files?: BotFile[];
  choices?: string[];
  failed?: boolean;
};
type Profile = { name: string; picture: string | null; greeting: string; suggestions: string[] };

const FALLBACK_PROFILE: Profile = {
  name: "Le Capitaine",
  picture: null,
  greeting: "Salut ! Je suis le Capitaine. Prix, tailles, disponibilité d'un maillot : demande-moi.",
  suggestions: ["Quels maillots sont disponibles ?", "Quel est le prix d'un maillot ?", "Comment commander ?"]
};

function storage(action: "get" | "set", key: string, value?: string) {
  try {
    if (action === "get") return window.localStorage.getItem(key);
    window.localStorage.setItem(key, value ?? "");
  } catch {
    // Private mode or blocked storage: the chat still works for this visit.
  }
  return null;
}

function getVisitorId() {
  const existing = storage("get", VISITOR_STORAGE_KEY);
  if (existing && /^[A-Za-z0-9_.:-]{6,80}$/.test(existing)) return existing;
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const id = `cs-web-${random}`.slice(0, 80);
  storage("set", VISITOR_STORAGE_KEY, id);
  return id;
}

async function botRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BOT_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) }
  });
  const payload = (await response.json().catch(() => null)) as { data?: T; error?: { code?: string } } | null;
  if (!response.ok || !payload || payload.error) {
    const error = new Error(payload?.error?.code ?? `HTTP_${response.status}`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return payload.data as T;
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

function toChoices(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((choice) => (typeof choice === "string" ? choice : str(choice?.label) || str(choice?.text) || str(choice?.value)))
    .filter(Boolean)
    .slice(0, 6);
}

function toFiles(value: unknown): BotFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((file) => (typeof file === "string" ? { url: file } : { url: str(file?.url), name: str(file?.name), mediaType: str(file?.mediaType) }))
    .filter((file) => file.url);
}

function toProfile(data: Record<string, unknown>): Profile {
  return {
    name: str(data.name) || FALLBACK_PROFILE.name,
    picture: str(data.picture) || str(data.pictureUrl) || str(data.avatarUrl) || null,
    greeting: str(data.greeting) || str(data.welcomeMessage) || str(data.welcome) || FALLBACK_PROFILE.greeting,
    suggestions: toChoices(data.suggestions ?? data.suggestedQuestions).length
      ? toChoices(data.suggestions ?? data.suggestedQuestions)
      : FALLBACK_PROFILE.suggestions
  };
}

function toHistory(data: unknown): Message[] {
  const items = Array.isArray(data) ? data : ((data as { messages?: unknown[] })?.messages ?? []);
  return items
    .map((item, index): Message | null => {
      const entry = item as Record<string, unknown>;
      const role = str(entry.role) || str(entry.from) || str(entry.author);
      const text = str(entry.text) || str(entry.content) || str(entry.message) || str(entry.reply);
      if (!text) return null;
      return {
        id: str(entry.id) || `h-${index}`,
        role: /user|visitor|client|customer|in/i.test(role) && !/assistant|bot/i.test(role) ? "user" : "bot",
        text,
        files: toFiles(entry.files)
      };
    })
    .filter((message): message is Message => message !== null);
}

// Minimal, safe rendering: paragraphs, line breaks, **bold** and bare links.
function renderText(text: string) {
  return text.split(/\n{2,}/).map((paragraph, p) => (
    <p key={p}>
      {paragraph.split("\n").map((line, l) => (
        <Fragment key={l}>
          {l > 0 ? <br /> : null}
          {renderInline(line)}
        </Fragment>
      ))}
    </p>
  ));
}

function renderInline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={index} href={part} target="_blank" rel="noreferrer">
          {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
        </a>
      );
    }
    return part;
  });
}

function errorText(error: unknown) {
  const status = (error as { status?: number })?.status;
  const code = (error as Error)?.message;
  if (status === 429) return "Doucement ! Trop de messages d'un coup. Attends une minute puis réessaie.";
  if (code === "AI_TOKEN_QUOTA" || status === 402) return "Le Capitaine fait une pause. Écris-nous sur WhatsApp ou via la page Contact.";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Tu sembles hors ligne. Vérifie ta connexion.";
  return "Le message n'est pas passé. Réessaie.";
}

export function ChatWidget() {
  const [enabled, setEnabled] = useState(Boolean(BOT_BASE));
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(FALLBACK_PROFILE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [teaser, setTeaser] = useState(false);
  const visitorId = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Bot profile — a disabled bot answers 404, in which case we hide the widget.
  useEffect(() => {
    if (!BOT_BASE) return;
    visitorId.current = getVisitorId();
    botRequest<Record<string, unknown>>("")
      .then((data) => setProfile(toProfile(data ?? {})))
      .catch((error) => {
        if ((error as { status?: number }).status === 404) setEnabled(false);
      });

    if (!storage("get", SEEN_STORAGE_KEY)) {
      const timer = window.setTimeout(() => setTeaser(true), 6000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const openChat = useCallback((prefill?: string) => {
    setOpen(true);
    setTeaser(false);
    storage("set", SEEN_STORAGE_KEY, "1");
    if (prefill) setInput(prefill);
  }, []);

  // Other parts of the site (product pages) can open the chat with a question.
  useEffect(() => {
    const handler = (event: Event) => openChat((event as CustomEvent<{ message?: string }>).detail?.message);
    window.addEventListener(OPEN_CHAT_EVENT, handler);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
  }, [openChat]);

  // Restore the conversation the first time the panel opens.
  useEffect(() => {
    if (!open || historyLoaded || !BOT_BASE) return;
    setHistoryLoaded(true);
    botRequest<unknown>(`/messages?visitorId=${encodeURIComponent(visitorId.current)}`)
      .then((data) => setMessages((current) => (current.length ? current : toHistory(data))))
      .catch(() => undefined);
  }, [open, historyLoaded]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  const send = useCallback(
    async (raw: string, retryId?: string) => {
      const text = raw.trim();
      if (!text || sending) return;

      const id = retryId ?? `u-${Date.now()}`;
      setNotice(null);
      setInput("");
      setMessages((current) =>
        retryId
          ? current.map((message) => (message.id === retryId ? { ...message, failed: false } : message))
          : [...current.map((message) => ({ ...message, choices: undefined })), { id, role: "user", text }]
      );
      setSending(true);

      try {
        const data = await botRequest<Record<string, unknown>>("/messages", {
          method: "POST",
          body: JSON.stringify({ visitorId: visitorId.current, message: text.slice(0, 2000), source: "widget" })
        });
        setMessages((current) => [
          ...current,
          {
            id: `b-${Date.now()}`,
            role: "bot",
            text: str(data.reply) || "…",
            files: toFiles(data.files),
            choices: toChoices(data.choices)
          }
        ]);
      } catch (error) {
        setMessages((current) => current.map((message) => (message.id === id ? { ...message, failed: true } : message)));
        setNotice(errorText(error));
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [sending]
  );

  const reset = async () => {
    if (!window.confirm("Effacer la conversation et recommencer ?")) return;
    setMessages([]);
    setNotice(null);
    await botRequest(`/messages?visitorId=${encodeURIComponent(visitorId.current)}`, { method: "DELETE" }).catch(() => undefined);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  };

  if (!enabled) return null;

  const avatar = profile.picture ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote bot picture, host unknown at build time
    <img src={profile.picture} alt="" className="chat__avatar" />
  ) : (
    <span className="chat__avatar chat__avatar--mark" aria-hidden="true">CS</span>
  );
  const lastBot = [...messages].reverse().find((message) => message.role === "bot");

  return (
    <div className={`chat${open ? " chat--open" : ""}`}>
      <section
        className="chat__panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby="chat-title"
        aria-hidden={!open}
        inert={!open}
      >
        <header className="chat__header">
          {avatar}
          <div className="chat__identity">
            <h2 id="chat-title">{profile.name}</h2>
            <p>
              <span className="chat__status-dot" aria-hidden="true" /> Répond en quelques secondes
            </p>
          </div>
          {messages.length > 0 ? (
            <button type="button" className="chat__icon-btn" onClick={reset} aria-label="Nouvelle conversation" title="Nouvelle conversation">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" /></svg>
            </button>
          ) : null}
          <button type="button" className="chat__icon-btn" onClick={() => setOpen(false)} aria-label="Fermer le chat" title="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="chat__messages" ref={scrollRef} aria-live="polite" aria-busy={sending}>
          <div className="chat__msg chat__msg--bot">
            <div className="chat__bubble">{renderText(profile.greeting)}</div>
          </div>

          {messages.length === 0 ? (
            <div className="chat__suggestions">
              {profile.suggestions.map((suggestion) => (
                <button type="button" key={suggestion} className="chat__chip" onClick={() => void send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          {messages.map((message) => (
            <div key={message.id} className={`chat__msg chat__msg--${message.role}${message.failed ? " chat__msg--failed" : ""}`}>
              <div className="chat__bubble">
                {renderText(message.text)}
                {message.files?.length ? (
                  <div className="chat__files">
                    {message.files.map((file) =>
                      /^image\//.test(file.mediaType ?? "") || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(file.url) ? (
                        <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="chat__file-image">
                          {/* eslint-disable-next-line @next/next/no-img-element -- product photo from SSS storage */}
                          <img src={file.url} alt={file.name ?? "Photo du maillot"} loading="lazy" />
                        </a>
                      ) : (
                        <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="chat__file-link">
                          {file.name || "Ouvrir le fichier"}
                        </a>
                      )
                    )}
                  </div>
                ) : null}
              </div>
              {message.failed ? (
                <button type="button" className="chat__retry" onClick={() => void send(message.text, message.id)} disabled={sending}>
                  Non envoyé · Réessayer
                </button>
              ) : null}
            </div>
          ))}

          {sending ? (
            <div className="chat__msg chat__msg--bot">
              <div className="chat__bubble chat__typing" aria-label={`${profile.name} écrit`}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}

          {!sending && lastBot?.choices?.length ? (
            <div className="chat__suggestions">
              {lastBot.choices.map((choice) => (
                <button type="button" key={choice} className="chat__chip" onClick={() => void send(choice)}>
                  {choice}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {notice ? (
          <p className="chat__notice" role="alert">
            {notice}
          </p>
        ) : null}

        <form className="chat__composer" onSubmit={onSubmit}>
          <label htmlFor="chat-input" className="sr-only">
            Ton message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            placeholder="Écris ton message…"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="chat__send" disabled={!input.trim() || sending} aria-label="Envoyer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>
        <p className="chat__footnote">
          Assistant automatique · pour une personne, <a href="/contact">page Contact</a>
        </p>
      </section>

      {teaser && !open ? (
        <button type="button" className="chat__teaser" onClick={() => openChat()}>
          Besoin d&apos;un conseil taille ou prix ? <strong>Demande au Capitaine</strong>
        </button>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        className="chat__launcher"
        onClick={() => (open ? setOpen(false) : openChat())}
        aria-expanded={open}
        aria-label={open ? "Fermer le chat" : `Discuter avec ${profile.name}`}
      >
        {open ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8M8 13h5" /></svg>
        )}
        {teaser && !open ? <span className="chat__badge" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
