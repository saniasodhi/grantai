import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Trash2, MessageCircle, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "grantai_chat_history";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  "Which grant should I prioritize?",
  "Improve my application opening",
  "What's my strongest match and why?",
  "Help me plan this week's applications",
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your AI grant officer. Ask me anything about your matches, applications, or strategy.",
};

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="my-1 space-y-0.5">${m}</ul>`)
    .replace(/\n/g, "<br/>");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface AskClaudeProps {
  className?: string;
}

export function AskClaude({ className = "" }: AskClaudeProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const userId = (() => {
    const s = localStorage.getItem("grantai_user_id");
    return s ? parseInt(s, 10) : undefined;
  })();

  // Persist to localStorage whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // Focus input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const allMessages = messages.length === 0 ? [WELCOME] : [WELCOME, ...messages];

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming) return;

      const userMsg: Message = { id: uid(), role: "user", content };
      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setStreaming(true);

      const history = [...messages, userMsg];
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      // Track error to surface in the bubble rather than silently swallow
      let streamError: string | null = null;

      try {
        const res = await fetch(`${BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(errBody.error || `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            // Extract the data line from potentially multi-line SSE event
            const dataLine = part
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const raw = dataLine.slice(6).trim();
            if (!raw) continue;

            let parsed: { content?: string; error?: string; done?: boolean };
            try {
              parsed = JSON.parse(raw) as typeof parsed;
            } catch {
              continue; // skip malformed frame
            }

            if (parsed.error) {
              streamError = parsed.error;
              break outer;
            }
            if (parsed.done) break outer;
            if (parsed.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.content }
                    : m,
                ),
              );
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        streamError =
          (err as Error).message || "I'm having trouble connecting. Try again in a moment.";
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }

      // Surface errors inside the bubble, remove empty bubbles
      if (streamError) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: streamError!, error: true }
              : m,
          ),
        );
      } else {
        // If stream ended with no content, remove the empty placeholder
        setMessages((prev) => {
          const msg = prev.find((m) => m.id === assistantId);
          if (msg && msg.content === "") {
            return prev.filter((m) => m.id !== assistantId);
          }
          return prev;
        });
      }
    },
    [messages, streaming, userId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 ${className}`}>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{
              width: 400,
              height: 600,
              background: "rgba(13, 18, 38, 0.96)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 0 0 1px rgba(16,185,129,0.15), 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(16,185,129,0.06)",
            }}
          >
            {/* Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b px-4 py-3"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Ask Claude</span>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
            >
              {allMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx === 0 ? 0 : 0.04 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" ? (
                    <div className="flex flex-col gap-2 max-w-[88%]">
                      <div
                        className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-white/90"
                        style={{
                          background: "rgba(59,130,246,0.08)",
                          border: "1px solid rgba(59,130,246,0.2)",
                        }}
                      >
                        {msg.content === "" && streaming ? (
                          <span className="flex items-center gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </span>
                        ) : msg.error ? (
                          <span className="text-red-400/80">{msg.content}</span>
                        ) : (
                          <span
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        )}
                      </div>

                      {/* Suggestion chips — only after welcome message */}
                      {idx === 0 && messages.length === 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => void send(s)}
                              disabled={streaming}
                              className="rounded-full border px-3 py-1 text-xs text-white/60 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40"
                              style={{ borderColor: "rgba(255,255,255,0.1)" }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white"
                      style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                    >
                      {msg.content}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div
              className="shrink-0 border-t p-3"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your grants..."
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none disabled:opacity-50"
                  style={{ maxHeight: 80, lineHeight: "1.5" }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
                  }}
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || streaming}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
                  style={{ background: input.trim() && !streaming ? "linear-gradient(135deg, #10b981, #3b82f6)" : "rgba(255,255,255,0.08)" }}
                >
                  {streaming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-center text-xs text-white/20">Enter to send · Shift+Enter for newline</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        onHoverStart={() => setHoverBtn(true)}
        onHoverEnd={() => setHoverBtn(false)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex h-14 items-center justify-center overflow-hidden rounded-full shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #10b981, #3b82f6)",
          width: hoverBtn ? "auto" : 56,
          paddingLeft: hoverBtn ? 20 : 0,
          paddingRight: hoverBtn ? 20 : 0,
          transition: "width 0.2s ease, padding 0.2s ease",
          boxShadow: "0 0 30px rgba(16,185,129,0.35), 0 8px 32px rgba(0,0,0,0.4)",
        }}
        aria-label="Ask Claude"
      >
        {/* Pulse ring */}
        {!open && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(16,185,129,0.5)" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <MessageCircle className="h-5 w-5 shrink-0 text-white" />
        <AnimatePresence>
          {hoverBtn && (
            <motion.span
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              className="overflow-hidden whitespace-nowrap text-sm font-semibold text-white"
            >
              Ask Claude
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
