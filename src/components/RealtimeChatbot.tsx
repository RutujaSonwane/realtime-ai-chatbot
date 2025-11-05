import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types";
import { usePersistentState } from "../hooks/usePersistentState";
import { useWebSocket } from "../hooks/useWebSocket";
import { renderMarkdownToHtml, formatTimestamp } from "../utils/format";
import { Copy, Check, Sun, Moon, Trash2 } from "lucide-react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws"; // update accordingly
const CHAR_LIMIT = 2000;

export default function RealtimeChatbot() {
  const [messages, setMessages] = usePersistentState<ChatMessage[]>("chat:messages", [
    {
      id: Date.now().toString(),
      role: "assistant",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pending, setPending] = useState(""); // streaming chunk buffer
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = usePersistentState<boolean>("ui:dark", true);

  const scrollingRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // WebSocket hook: backend should send text chunks as message frames.
  const { connected, send } = useWebSocket(
    WS_URL,
    (chunk) => {
      // the backend can send special control messages if you want, e.g. JSON with {type:'chunk'|'end'}
      // we'll try to parse JSON; if it fails, treat it as plain chunk text.
      try {
        const obj = JSON.parse(chunk);
        if (obj?.type === "chunk") {
          setPending((p) => p + obj.text);
          setIsGenerating(true);
        } else if (obj?.type === "end") {
          finishPending(obj?.final ?? "");
        } else if (obj?.type === "error") {
          finishPending(`Error: ${obj.message}`);
        } else {
          // fallback: append text field or raw
          if (typeof obj.text === "string") setPending((p) => p + obj.text);
        }
      } catch {
        // plain string chunk
        setPending((p) => p + chunk);
        setIsGenerating(true);
      }
    },
    () => {
      // onOpen -> nothing special
    },
    () => {
      // onClose
      setIsGenerating(false);
    },
    () => {
      // onError
      setIsGenerating(false);
    }
  );

  // Auto-scroll to bottom on messages/pending changes
  useEffect(() => {
    const el = scrollingRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  function finishPending(finalFromServer?: string) {
    const finalText = finalFromServer ? pending + finalFromServer : pending;
    if (finalText.trim().length > 0) {
      const msg = {
        id: Date.now().toString(),
        role: "assistant" as const,
        content: finalText,
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, msg]);
    }
    setPending("");
    setIsGenerating(false);
  }

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    if (input.length > CHAR_LIMIT) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString() + "-u",
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending("");
    setIsGenerating(true);

    // Send over WebSocket. Format is up to your backend. We send a JSON wrapper.
    const payload = JSON.stringify({ type: "user_message", text: userMsg.content });
    const ok = send(payload);
    if (!ok) {
      // fallback: show error message
      setIsGenerating(false);
      setMessages((m) => [
        ...m,
        { id: Date.now().toString() + "-err", role: "assistant", content: "Unable to send: disconnected.", timestamp: new Date().toISOString() },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    // send a cancel message to backend if supported
    try {
      send(JSON.stringify({ type: "cancel" }));
    } catch {}
    finishPending("[stopped]");
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleClear = () => {
    setMessages([]);
    setPending("");
    setIsGenerating(false);
    localStorage.removeItem("chat:messages");
  };

  // small UI helpers
  const charCount = input.length;
  const canSend = !!input.trim() && !isGenerating && charCount <= CHAR_LIMIT;

  return (
    <div className={`flex h-screen ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="w-full max-w-4xl mx-auto flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 sticky top-0 z-20 ${darkMode ? "bg-gray-800/60 border-b border-gray-700" : "bg-white/60 border-b border-gray-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <div className="font-semibold">Real-time AI Chat</div>
            <div className="text-xs ml-2 opacity-70">{connected ? "Connected" : "Disconnected (reconnecting...)"}</div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode((d) => !d)} className="p-2 rounded hover:bg-gray-700/30">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleClear} className="p-2 rounded hover:bg-gray-700/30" title="Clear chat">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollingRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                {m.role === "assistant" && (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                    A
                  </div>
                )}
                <div className={`max-w-[80%] ${m.role === "user" ? "text-right" : "text-left"}`}>
                  <div className={`rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white" : darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900 border border-gray-200"}`}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(m.content) }} />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs opacity-60">
                    <span>{formatTimestamp(m.timestamp)}</span>
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCopy(m.content, m.id)} className="p-1">
                          {copiedId === m.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {m.role === "user" && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">U</div>}
              </div>
            ))}

            {/* Pending streaming message */}
            {pending && (
              <div className="flex gap-3 justify-start">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">A</div>
                <div className={`max-w-[80%] ${darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900 border border-gray-200"} rounded-2xl px-4 py-3`}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(pending + (isGenerating ? "<span class='inline-block w-1 h-4 bg-purple-500 animate-pulse ml-1'></span>" : "") )}} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className={`p-4 border-t ${darkMode ? "border-gray-700 bg-gray-800/60" : "border-gray-200 bg-white/60"}`}>
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, CHAR_LIMIT))}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type your message... (Shift+Enter for newline)"
                className={`w-full rounded-xl px-4 py-3 pr-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
                disabled={isGenerating}
                style={{ minHeight: 52, maxHeight: 200 }}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <button onClick={handleStop} className="px-3 py-2 rounded bg-red-500 text-white">Stop</button>
                  </>
                ) : (
                  <button onClick={handleSend} disabled={!canSend} className="px-3 py-2 rounded bg-gradient-to-br from-purple-500 to-pink-500 text-white disabled:opacity-50">
                    Send
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 opacity-70">
              <div>{isGenerating ? "AI is generating..." : "AI can make mistakes. Verify critical info."}</div>
              <div>{charCount}/{CHAR_LIMIT}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
