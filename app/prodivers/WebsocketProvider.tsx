"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUser } from "@/app/prodivers/UserProvider";

const WSContext = createContext<WebSocket | null>(null);

type Props = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: Props) {
  const { user, loading } = useUser();

  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef<number>(1000);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  // 🔥 FULL RESYNC HELPER
  const resyncGlobalChat = async () => {
    try {
      const res = await fetch("/api/chat/message", {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = await res.json();

      window.dispatchEvent(
        new CustomEvent("chat_resync", {
          detail: data.messages || [],
        })
      );
    } catch (err) {
      console.error("Chat resync failed:", err);
    }
  };

  const connect = () => {
    if (!user) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${protocol}://${window.location.host}/ws`;

      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log("✅ WebSocket connected");
        retryDelay.current = 1000;
        setWs(socket);

        // 🔥 RESYNC ON CONNECT / RECONNECT
        resyncGlobalChat();
      };

      socket.onclose = () => {
        console.warn("⚠️ WebSocket closed");
        setWs(null);

        if (!user) return;
        scheduleReconnect();
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket connect error:", err);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current || !user) return;

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      retryDelay.current = Math.min(retryDelay.current * 2, 5000);
      connect();
    }, retryDelay.current);
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      clearReconnectTimer();
      if (ws) {
        ws.close();
        setWs(null);
      }
      return;
    }

    if (!ws) {
      connect();
    }

    return () => {
      clearReconnectTimer();
    };
  }, [user, loading]);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export function useWebSocket() {
  return useContext(WSContext);
}