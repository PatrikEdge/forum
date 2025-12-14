"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const WSContext = createContext<WebSocket | null>(null);

type Props = {
  children: React.ReactNode;
};

export function WebSocketProvider({ children }: Props) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef<number>(1000); // ms – exponenciális backoff

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      // ha kell auth token, ide tudsz tenni query paramot pl. ?token=...
      const url = `${protocol}://${window.location.host}/ws`;

      const socket = new WebSocket(url);

      socket.onopen = () => {
        console.log("✅ WebSocket connected");
        retryDelay.current = 1000;
        setWs(socket);
      };

      socket.onclose = () => {
        console.warn("⚠️ WebSocket closed, reconnecting...");
        setWs(null);
        scheduleReconnect();
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        // hiba esetén is zárjuk → onclose majd reconnectel
        socket.close();
      };
    } catch (err) {
      console.error("WebSocket connect error:", err);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return; // már várunk reconnectre

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      retryDelay.current = Math.min(retryDelay.current * 2, 5000);
      connect();
    }, retryDelay.current);
  };

  useEffect(() => {
    connect();

    return () => {
      clearReconnectTimer();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    // ⚠️ szándékosan NINCS ws a dependency-ben, különben reconnect loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <WSContext.Provider value={ws}>{children}</WSContext.Provider>;
}

export function useWebSocket() {
  return useContext(WSContext);
}
