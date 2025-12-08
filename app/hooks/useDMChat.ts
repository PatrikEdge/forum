"use client";
import { useEffect, useState } from "react";
import { useWebSocket } from "../prodivers/WebsocketProvider";

export function useDMChat(activeDM: string | null) {
  const ws = useWebSocket();
  const [messages, setMessages] = useState<any[]>([]);

  const loadMessages = async () => {
    if (!activeDM) return;
    const res = await fetch(`/api/dm/messages/${activeDM}`);
    if (res.ok) setMessages((await res.json()).messages);
  };

  useEffect(() => {
    loadMessages();
  }, [activeDM]);

  useEffect(() => {
    if (!ws) return;
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "dm_message" && data.fromId === activeDM) {
        setMessages(prev => [...prev, data.message]);
      }
    };
  }, [ws, activeDM]);

  const sendDM = (text: string) => {
    if (!text || !activeDM) return;
    ws?.send(JSON.stringify({ type: "dm_message", text, to: activeDM }));
  };

  return { messages, sendDM };
}
