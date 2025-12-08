"use client";
import { useEffect, useState, useCallback } from "react";
import { useWebSocket } from "../prodivers/WebsocketProvider";

export function useGlobalChat() {
  const ws = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);

  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/chat/message");
    if (res.ok) setMessages((await res.json()).messages);
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "global_message") {
        setMessages(prev => [...prev, data.message]);
      }

      if (data.type === "typing") {
        setTypingUsers(prev =>
          prev.includes(data.user) ? prev : [...prev, data.user]
        );
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== data.user));
        }, 2500);
      }
    };
  }, [ws]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "global_message", text }));
    } else {
      setPendingQueue(p => [...p, text]);
    }
  };

  useEffect(() => {
    if (!ws) return;
    if (ws.readyState !== WebSocket.OPEN) return;
    pendingQueue.forEach(text => ws.send(JSON.stringify({ type: "global_message", text })));
    setPendingQueue([]);
  }, [ws, pendingQueue]);

  const sendTyping = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing" }));
    }
  };

  return { messages, sendMessage, typingUsers, sendTyping };
}
