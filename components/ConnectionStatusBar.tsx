"use client";

import { useWebSocket } from "@/app/prodivers/WebsocketProvider";

export function ConnectionStatusBar() {
  const { state } = useWebSocket();

  // ➤ Csak akkor jelenjen meg, ha NEM vagyunk open állapotban
  if (state === "open") return null;

  const info =
    {
      connecting: { text: "Kapcsolódás...", color: "bg-yellow-500 text-black" },
      closed: { text: "Kapcsolat megszakadt", color: "bg-red-600 text-white" },
    }[state] || { text: "Ismeretlen állapot", color: "bg-gray-500 text-white" };

  return (
    <div
      className={`w-full p-2 rounded-lg text-center font-semibold animate-pulse ${info.color}`}
    >
      {info.text}
    </div>
  );
}
