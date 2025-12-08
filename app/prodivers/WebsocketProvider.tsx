"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

const WSContext = createContext<WebSocket | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const retry = useRef(1000);

  function connect() {
    const socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);

    socket.onopen = () => {
      console.log("WS Connected");
      retry.current = 1000;
      setWs(socket);
    };

    socket.onclose = () => {
      console.log("WS Disconnected");
      reconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  function reconnect() {
    if (reconnectTimer.current) return;

    reconnectTimer.current = setTimeout(() => {
      connect();
      reconnectTimer.current = null;
      retry.current = Math.min(retry.current * 2, 5000);
    }, retry.current);
  }

  useEffect(() => {
    connect();
    return () => ws?.close();
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export function useWebSocket() {
  return useContext(WSContext);
}