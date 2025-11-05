import React, { useEffect, useState, useRef } from "react";

const ChatApp = () => {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [chatHistory, setChatHistory] = useState<
    { id: number; title: string; messages: any[] }[]
  >([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 🔹 Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 🔹 Setup WebSocket connection
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000");
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => setIsConnected(false);

    socket.onmessage = (event) => {
      const data = event.data;
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "ai") {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, text: lastMsg.text + data },
          ];
        } else {
          return [...prev, { role: "ai", text: data }];
        }
      });
    };

    return () => socket.close();
  }, []);

  // 🔹 Send message
  const handleSend = () => {
    if (!input.trim() || !socketRef.current) return;
    setMessages((prev) => [...prev, { role: "user", text: input }]);
    socketRef.current.send(input);
    setInput("");
  };

  // 🔹 Create new chat
  const handleNewChat = () => {
    const chatId = Date.now();
    const newChat = {
      id: chatId,
      title: `Chat ${chatHistory.length + 1}`,
      messages,
    };
    if (messages.length > 0) setChatHistory([...chatHistory, newChat]);
    setMessages([]);
    setActiveChat(chatId);
  };

  // 🔹 Load previous chat
  const handleSelectChat = (id: number) => {
    const selectedChat = chatHistory.find((c) => c.id === id);
    if (selectedChat) {
      setMessages(selectedChat.messages);
      setActiveChat(id);
    }
  };

  return (
    <div
      className={`flex h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`w-64 p-4 flex flex-col border-r ${
          darkMode ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-white"
        }`}
      >
        <h2 className="text-lg font-bold mb-4 text-center">💬 Chat History</h2>
        <button
          onClick={handleNewChat}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md mb-4"
        >
          + New Chat
        </button>

        <div className="flex-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-4">
              No chats yet
            </p>
          ) : (
            chatHistory.map((c) => (
              <div
                key={c.id}
                className={`p-2 mb-2 rounded-md cursor-pointer ${
                  activeChat === c.id
                    ? darkMode
                      ? "bg-blue-700"
                      : "bg-blue-300"
                    : darkMode
                    ? "hover:bg-gray-700"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => handleSelectChat(c.id)}
              >
                {c.title}
              </div>
            ))
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="mt-4 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md"
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700">
          <h1 className="text-lg font-semibold">AI Chatbot</h1>
          <span
            className={`text-sm ${
              isConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {isConnected ? "● Connected" : "● Disconnected"}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-xl max-w-[75%] whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : darkMode
                  ? "mr-auto bg-gray-700 text-white"
                  : "mr-auto bg-gray-300 text-black"
              }`}
            >
              {m.text}
            </div>
          ))}
          {/* invisible div for auto scroll */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex items-center p-3 border-t border-gray-700">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 p-2 rounded-lg outline-none ${
              darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
            }`}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected}
            className="ml-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApp;
