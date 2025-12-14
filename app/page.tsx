"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Home,
  User,
  MessageCircle,
  Bell,
  Mail,
  Search,
  ThumbsUp,
  Send,
  X,
  Pin,
  Trash2,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "./prodivers/WebsocketProvider";
import Cropper from "react-easy-crop";

// --------- helper a cropolt képhez (canvas) ---------
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

// 🔥 UGYANAZ, mint a Global Chat
function formatChatDate(dateString: string) {
  const d = new Date(dateString);
  const now = new Date();

  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  return sameDay
    ? d.toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : `${d.toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })} ${d.toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
}

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas is empty"));
    }, "image/png");
  });
}

// ------------------------- useUser -------------------------
const useUser = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return { user, loading, refreshUser };
};

function ProfileStatsCard({ user }: { user: any }) {
  const joinedAt = new Date(user.joinedAt);
  const daysOnSite = Math.floor(
    (Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const stats = [
    { label: "Posztok", value: user.postsCount ?? 0 },
    { label: "Témák", value: user.threadsCount ?? 0 },
    { label: "Kapott lájkok", value: user.likesReceived ?? 0 },
    { label: "Napja tag", value: daysOnSite },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">📊 Statisztikák</h3>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-black/30 rounded-lg p-4 text-center"
          >
            <p className="text-2xl font-bold text-lime-300">
              {s.value}
            </p>
            <p className="text-xs text-white/60 mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------- Sidebar -------------------------
function Sidebar({ activePage, setActivePage, unreadNotifications, unreadDM }: any) {
  const items = [
    { id: "home", icon: Home, label: "Fórum" },
    { id: "chat", icon: MessageCircle, label: "Globális chat" },
    { id: "dm", icon: Mail, label: "Privát üzenetek", badge: unreadDM },
    { id: "notifications", icon: Bell, label: "Értesítések", badge: unreadNotifications },
    { id: "profile", icon: User, label: "Profil" },
  ];

  return (
    <aside className="md:w-20 w-full h-16 md:h-auto bg-black/60 md:bg-black/50 rounded-b-3xl md:rounded-r-3xl backdrop-blur-xl flex md:flex-col flex-row items-center justify-center gap-6 md:gap-8 border-b md:border-b-0 md:border-r border-white/20 p-2 md:py-6">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activePage === item.id;
        const showBadge = (item.badge || 0) > 0;
        return (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className="relative flex items-center justify-center"
            title={item.label}
          >
            <Icon
              className={
                "w-6 h-6 transition-transform " +
                (active
                  ? "text-lime-300 scale-110 drop-shadow-lg"
                  : "text-white/80 hover:text-white hover:scale-110")
              }
            />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border border-black flex items-center justify-center text-[10px] font-bold">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}

// ------------------------- Topbar -------------------------
function Topbar({ user }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex items-center justify-between bg-white/10 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/20 shadow-lg">
      <div className="relative w-2/3 md:w-1/2">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Keresés..."
          className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
      </div>

      {user && (
        <div className="flex items-center gap-3 md:gap-4">
          <div className="bg-white/20 w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
            ) : (
              <span className="text-sm font-semibold">
                {user?.username?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="text-xs md:text-sm text-right hidden md:block">
            <p className="font-semibold">{user.username}</p>
            <p className="text-lime-300 text-[11px] md:text-xs">
              {user.role === "MODERATOR" ? "Moderátor" : user.role === "ADMIN" ? "Admin" : "Felhasználó"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Kijelentkezés"
            className="p-2 bg-red-500/80 hover:bg-red-600 text-black rounded-lg transition flex items-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function GlobalChat({ user, messages, setMessages }: { 
  user: any, 
  messages: any[], 
  setMessages: any 
}) {
  const ws = useWebSocket();
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // ---- Edit ----
  const [editMessage, setEditMessage] = useState<any>(null);
  const [editText, setEditText] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
  const el = listRef.current;
  if (!el) return;

  function onScroll() {
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
    setShowScrollButton(!atBottom);
  }

  el.addEventListener("scroll", onScroll);
  return () => el.removeEventListener("scroll", onScroll);
}, []);

  const REACTIONS = ["❤️", "😆", "👍", "😡", "😢", "😮"];

  // ---- Typing ----
  function sendTyping() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(
    JSON.stringify({
      type: "typing",
      chat: "global",
      userId: user.id,
      username: user.username,
    })
  );
}

  // ---- Reaction Toggle (JAVÍTVA: REST API-t használ) ----
function toggleReaction(messageId, emoji) {
  fetch("/api/chat/reaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messageId, emoji }),
  }).catch(() => {
    alert("Hiba történt a reakció elküldésekor.");
  });
}

  function startEdit(msg: any) {
  setEditMessage(msg);
  setEditText(msg.text);
}

  function saveEdit() {
  if (!editMessage || !editText.trim()) return;

  const messageId = editMessage.id;
  const newText = editText.trim();

  // 1. Local echo (maradhat)
  setMessages((prev) =>
    prev.map((m) =>
      m.id === messageId ? { ...m, text: newText, edited: true } : m
    )
  );

  // 2. REST PUT – EBBEN VAN A .then / .catch
  fetch(`/api/chat/message/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: newText }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errorText = await res.text();
        console.error(
          "Edit save SERVER error (Status:",
          res.status,
          "):",
          errorText
        );
        alert("Hiba történt a szerkesztés mentésekor: " + errorText);
        // ide akár betolhatsz egy rollback-et is, ha akarod
        return;
      }

      // 3. Sikeres mentés után opcionális WS broadcast
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "chat_edit",
            id: messageId,
            text: newText,
          })
        );
      }
    })
    .catch((e) => {
      console.error("Edit save NETWORK/FETCH error:", e);
      alert(
        "Hiba történt a szerkesztés mentésekor. Kérem, ellenőrizze a szerver logokat!"
      );
    });

  // 4. Modal bezárása
  setEditMessage(null);
  setEditText("");
}

  // ---- WebSocket Listener ----
  useEffect(() => {
    if (!ws) return;

    const onMessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        const incomingMessage = data.message;
        
        // 🟢 Új üzenet - DEDUBBLIKÁCIÓS LOGIKA
        if (data.type === "global_message") {
          
          setMessages((prev: any[]) => {
            // Ellenőrizzük, hogy az üzenet a mi általunk küldött, Local Echo-t felváltó üzenet-e.
            if (incomingMessage.tempId && user.id === incomingMessage.authorId) {
                // Lecseréljük az ideiglenes üzenetet a végleges, adatbázisból származó üzenetre
                return prev.map((m) =>
                    m.id === incomingMessage.tempId 
                        ? { ...incomingMessage, id: incomingMessage.id } // Lecseréljük
                        : m
                );
            }
            
            // Ha ez egy másik felhasználó üzenete, vagy ha nincs tempId, egyszerűen hozzáadjuk.
            return [...prev, incomingMessage];
          });
          return;
        }

        // 👀 Valaki ír
        if (data.type === "typing" && data.chat === "global") {
  if (data.userId !== user.id) {
    setTypingUser(data.username);
    setTimeout(() => setTypingUser(null), 2500);
  }
  return;
}

        // 😀 Reakciók frissültek
        if (data.type === "chat_reaction") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId ? { ...m, reactions: data.reactions } : m
            )
          );
          return;
        }

        // ✏️ Szerkesztett üzenet
        // ✏️ BEJÖVŐ SZERKESZTÉS
if (data.type === "chat_edit") {
  setMessages((prev) =>
    prev.map((m) => (m.id === data.message.id ? data.message : m))
  );
  return;
}
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.addEventListener("message", onMessage);
    return () => ws.removeEventListener("message", onMessage);
  }, [ws, user.id, setMessages]); // user.id hozzáadva dependency-nek

  // ---- Auto-scroll ----
  useEffect(() => {
  const el = listRef.current;
  if (!el) return;

  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;

  if (atBottom) {
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }
}, [messages]);

  // ---- SEND MESSAGE ----
function handleSend() {
    if (!text.trim()) return; 
    const msg = text.trim();
    setText("");

    // 1. Lokális azonnali megjelenítés (Local Echo)
    const tempId = "temp-" + crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: msg,
        authorId: user.id,
        author: user,
        createdAt: new Date().toISOString(),
        reactions: [],
        edited: false,
      },
    ]);

    // 2. REST API HÍVÁS A PERZISZTENCIÁHOZ (adatbázisba mentés)
    // EZ A HÍVÁS INDÍTJA EL A SZERVEROLDALI MENTÉST ÉS BROADCASTOT!
    fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Elküldjük a tempId-t a szervernek
        body: JSON.stringify({ text: msg, tempId: tempId }), 
    })
    // NINCS TOVÁBBI WS.SEND() ITT! Csak a REST API hívás!
    .catch(e => {
        console.error("Chat message send error:", e);
        // Hiba esetén eltávolítjuk a local echo üzenetet
        setMessages((prev) => prev.filter(m => m.id !== tempId));
        alert("Hiba történt az üzenet elküldésekor. Kérem, próbálja újra.");
    });
}

  return (
    <div className="relative flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
      {/* HEADER */}
      <div className="border-b border-white/20 p-4">
        <h2 className="text-xl font-bold">🌍 Globális Chat</h2>
        <p className="text-sm text-white/70">Beszélgetés valós időben</p>
      </div>

      {/* MESSAGE LIST */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          return (
            <div
              key={msg.id}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <b>{msg.author?.username}</b>
                <small className="text-white/50">
                  {(() => {
  const d = new Date(msg.createdAt);
  const now = new Date();

  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  return sameDay
    ? d.toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : `${d.toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })} ${d.toLocaleTimeString("hu-HU", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
})()}
                </small>

                {/* Edit button */}
                {msg.authorId === user.id && !String(msg.id).startsWith("temp-") && (
                  <button onClick={() => startEdit(msg)} className="text-xs text-blue-300 hover:text-blue-200" title="Szerkesztés" >
                    ✏️
                  </button>
                )}
              </div>

              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>

              {/* Edited Label */}
              {msg.edited && (
  <small
    className="text-white/40 text-[10px] cursor-help"
    title={`Szerkesztve: ${new Date(msg.updatedAt).toLocaleString("hu-HU")}`}
  >
    (szerkesztve)
  </small>
)}

{/* TYPING */}
      {typingUser && (
  <div className="p-2 text-sm text-white/70 italic animate-pulse">
    💬 {typingUser} éppen ír...
  </div>
)}

              {/* REACTIONS */}
              <div className="flex gap-1 mt-2">
                {REACTIONS.map((emoji) => (
                  <button
  key={emoji}
  onClick={() => {
  if (String(msg.id).startsWith("temp-")) return; // vagy crypto id felismerése
  toggleReaction(msg.id, emoji);
}}

  className={
    "text-sm px-2 py-[1px] rounded-md transition " +
    (msg.reactions?.some(r => r.emoji === emoji && r.mine)
      ? "bg-lime-500/30 scale-110"
      : "hover:bg-white/20")
  }
>
  {emoji}
</button>
                ))}
              </div>

              {/* REACTION COUNT */}
{/* REACTION COUNT (Tooltip-pel) */}
{msg.reactions?.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1 text-xs">
    {msg.reactions.map((r: any, i: number) => (
      <div key={i} className="relative group">
        <span
          className={`px-2 py-[1px] rounded-full border border-white/20 bg-white/10 flex items-center gap-1 cursor-default ${
            r.mine ? "bg-lime-500/30 border-lime-300/50" : ""
          }`}
        >
          {r.emoji}
          <b className="text-[10px] opacity-90">{r.count}</b>
        </span>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex bg-black/90 text-white text-[11px] px-2 py-1 rounded shadow border border-white/20 whitespace-nowrap z-50">
          {r.users?.join(", ")}
        </div>
      </div>
    ))}
  </div>
)}
            </div>
          );
        })}
      </div>

{/* Scroll To Bottom Button */}
{showScrollButton && (
  <button
    onClick={() => {
      if (listRef.current) {
        listRef.current.scrollTo({
  top: listRef.current.scrollHeight,
  behavior: "smooth",
});
      }
    }}
    className="absolute right-4 bottom-20 bg-lime-500 text-black px-3 py-1 rounded-lg shadow-lg hover:bg-lime-600 transition z-50"
  >
    ↓ Ugrás az aljára
  </button>
)}

{/* INPUT BAR */}
<div className="shrink-0 border-t border-white/20 p-4 flex gap-2 items-center">

  {/* Input */}
  <input
    value={text}
    onChange={(e) => {
      setText(e.target.value);
      sendTyping();
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }}
    placeholder="Írj üzenetet..."
    className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
  />

{/* Send Button */}
<button
  onClick={handleSend}
  disabled={!text.trim()}
  className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
>
  <Send className="w-4 h-4" /> Küldés
</button>
</div>

      {/* EDIT POPUP */}
      {editMessage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 rounded-2xl w-80">
            <h3 className="font-semibold mb-2">Üzenet szerkesztése</h3>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-black/30 p-2 rounded-lg text-white border border-white/30"
            />

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEditMessage(null)}
                className="text-white/70 hover:text-white"
              >
                Mégse
              </button>
              <button
                onClick={saveEdit}
                className="bg-lime-500 px-3 py-1 rounded text-black hover:bg-lime-600"
              >
                Mentés
              </button>
            </div>
          </div>
</div>
      )}
    </div>
  );
}


// ------------------------- Main Page -------------------------
export default function ForumUI() {
  const { user, loading, refreshUser } = useUser();
  const router = useRouter();
  const ws = useWebSocket();

  const [globalText, setGlobalText] = useState("");
  const [sending, setSending] = useState(false);

  // Avatar cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  function sendGlobalMessage() {
    if (!globalText.trim()) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "global_message", text: globalText }));
      setGlobalText("");
      return;
    }

    setSending(true);
    fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: globalText }),
    }).finally(() => {
      setGlobalText("");
      setSending(false);
    });
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Forum state
  const [activePage, setActivePage] = useState("home");
  const [categories, setCategories] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  // Profile state
  const [profileUsername, setProfileUsername] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // DM state
  const [dmUsers, setDMUsers] = useState<any[]>([]);
  const [dmMessages, setDMMessages] = useState<any[]>([]);
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [dmText, setDMText] = useState("");
  const [dmLoading, setDMLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchDMText, setSearchDMText] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [dmTypingUser, setDMTypingUser] = useState<string | null>(null);
const [editingDM, setEditingDM] = useState<any | null>(null);
const [editingDMText, setEditingDMText] = useState("");
  const dmListRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  // 🔁 DM oldalra lépéskor mindig frissítjük a listát + badge-et
useEffect(() => {
  if (!user) return;
  loadDMUsers();        // 🔥 mindig
  loadUnreadCounts();  // 🔥 mindig
}, [user]);

useEffect(() => {
  const el = dmListRef.current;
  if (!el) return;

  if (isAtBottomRef.current) {
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth",
    });
  }
}, [dmMessages]);

useEffect(() => {
  const el = dmListRef.current;
  if (!el) return;

  useEffect(() => {
  if (activePage !== "dm") return;
  if (!activeDM) return;

  // ⚠️ FONTOS: timeout + requestAnimationFrame
  const t = setTimeout(() => {
    requestAnimationFrame(() => {
      const el = dmListRef.current;
      if (!el) return;

      el.scrollTop = el.scrollHeight;
      isAtBottomRef.current = true;
    });
  }, 0);

  return () => clearTimeout(t);
}, [activePage, activeDM, dmMessages.length]);

  
  function onScroll() {
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
  }

  el.addEventListener("scroll", onScroll);
  return () => el.removeEventListener("scroll", onScroll);
}, []);


// 🔁 BETÖLTÉSKOR
useEffect(() => {
  const saved = localStorage.getItem("activeDM");
  if (saved) setActiveDM(saved);
}, []);

// 💾 VÁLTOZÁSKOR
useEffect(() => {
  if (activeDM) {
    localStorage.setItem("activeDM", activeDM);
  } else {
    localStorage.removeItem("activeDM");
  }
}, [activeDM]);

  // Global Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Unread counts
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadDM, setUnreadDM] = useState(0);

  // Online users
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newReply, setNewReply] = useState("");
  const [showNewTopicPopup, setShowNewTopicPopup] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");

  useEffect(() => {
  fetch("/api/users/online")
    .then(res => res.json())
    .then(data => setAllUsers(data.users))
    .catch(() => setAllUsers([]));
}, []);

  // WS: presence + DM
  useEffect(() => {
    if (!ws || !user) return;

    function onMessage(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data as string);

        // --- presence snapshot ---
        if (data.type === "presence_snapshot") {
          setOnlineUsers(Array.isArray(data.users) ? data.users : []);

          fetch("/api/users/online")
            .then((res) => res.json())
            .then((res) => setAllUsers(res.users))
            .catch(() => setAllUsers([]));

          return;
        }

        // --- presence update ---
        if (data.type === "presence_update") {
          setOnlineUsers((prev) => {
            const set = new Set(prev);
            if (data.status === "online") set.add(data.userId);
            else if (data.status === "offline") set.delete(data.userId);
            return Array.from(set);
          });

          fetch("/api/users/online")
            .then((res) => res.json())
            .then((res) => setAllUsers(res.users))
            .catch(() => setAllUsers([]));

          return;
        }

        // --- DM érkezik ---
if (data.type === "dm_message") {
  const partnerId =
    data.message.fromId === user.id
      ? data.message.toId
      : data.message.fromId;

  // 🔥 Conversations lista frissítése
setDMUsers(prev => {
  const exists = prev.find(c => c.partner.id === partnerId);

  const updated = exists
    ? prev.map(c =>
        c.partner.id === partnerId
          ? {
              ...c,
              lastMessage: data.message,
              unreadCount:
                activeDM === partnerId || data.message.fromId === user.id
                  ? 0
                  : c.unreadCount + 1,
            }
          : c
      )
    : [
        {
          partner:
            data.message.fromId === user.id
              ? data.message.to
              : data.message.from,
          lastMessage: data.message,
          unreadCount: data.message.fromId === user.id ? 0 : 1,
        },
        ...prev,
      ];

  // 🔥 RENDEZÉS – legfrissebb felül
  return updated.sort(
    (a, b) =>
      new Date(b.lastMessage?.createdAt || 0).getTime() -
      new Date(a.lastMessage?.createdAt || 0).getTime()
  );
});

  // 🔥 Aktív beszélgetés esetén azonnal megjelenik
  if (activeDM === partnerId) {
    setDMMessages(prev => [...prev, data.message]);
  }

  loadUnreadCounts();
}


        // --- DM typing ---
        if (data.type === "dm_typing") {
          if (activeDM && data.fromId === activeDM) {
            setDMTypingUser(data.username ?? "Valaki");
            setTimeout(() => setDMTypingUser(null), 2500);
          }
          return;
        }

        // --- DM read receipt ---
        if (data.type === "dm_read") {
          // partnerId = én, readerId = a másik
          if (data.partnerId === user.id) {
            setDMMessages((prev: any[]) =>
              prev.map((m) =>
                // az én üzeneteim lettek olvasva
                m.fromId === user.id && m.toId === data.readerId
                  ? { ...m, read: true }
                  : m
              )
            );
          }
          return;
        }

        // ✏️ DM EDIT
if (data.type === "dm_edit") {
  setDMMessages(prev =>
    prev.map(m =>
      m.id === data.message.id ? data.message : m
    )
  );
  return;
}

        // --- DM revoke ---
if (data.type === "dm_revoke") {
  setDMMessages(prev =>
    prev.map(m =>
      m.id === data.messageId
        ? {
            ...m,
            revoked: true,
            text: null,
          }
        : m
    )
  );
  return;
}

      } catch (e) {
        console.error("WS parse error", e);
      }
    }
    

    ws.addEventListener("message", onMessage);
    return () => ws.removeEventListener("message", onMessage);
  }, [ws, user?.id, activeDM]);
  

  // ------------------------- Fetchers -------------------------
  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) setCategories((await res.json()).categories);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const loadThreads = async () => {
    try {
      const query = selectedCategory !== "all" ? `?categoryId=${selectedCategory}` : "";
      const res = await fetch(`/api/threads${query}`);
      if (res.ok) setThreads((await res.json()).threads);
    } catch (err) {
      console.error("Failed to load threads:", err);
    }
  };

  const loadThread = async (id: string) => {
    try {
      const res = await fetch(`/api/threads/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveThread(data.thread);
        setPosts(data.thread.posts);
      }
    } catch (err) {
      console.error("Failed to load thread:", err);
    }
  };

  const loadDMUsers = async () => {
    setDMLoading(true);
    try {
      const res = await fetch("/api/dm/conversations");
      if (res.ok) {
        const data = await res.json();
        setDMUsers(data.conversations);
      }
    } catch (err) {
      console.error("Failed to load DM users:", err);
    }
    setDMLoading(false);
  };

const loadConversation = async (partnerId: string) => {
  try {
    const res = await fetch(`/api/dm/messages/${partnerId}`);
    if (res.ok) {
      const data = await res.json();
      setDMMessages(data.messages || []);
    } else {
      setDMMessages([]);
    }
  } catch {
    setDMMessages([]);
  }
};



useEffect(() => {
  if (!activeDM) return;

  loadConversation(activeDM);

  fetch("/api/dm/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partnerId: activeDM }),
  });
}, [activeDM]);


const sendMessage = () => {
  if (!dmText || !activeDM) return;

  const partnerId = activeDM; // 🔒 LEZÁRVA
  const text = dmText.trim();
  setDMText("");

  fetch("/api/dm/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toId: partnerId, text }),
  }).catch(() => {
    alert("Hiba történt az üzenet elküldésekor.");
  });
};

const revokeDM = async (messageId: string) => {
  await fetch(`/api/dm/message/${messageId}/revoke`, {
    method: "POST",
  });
};

  const loadChatMessages = async () => {
    if (chatMessages.length > 0) {
        return; 
    }
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat/message");
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load chat messages:", err);
    }
    setChatLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatText.trim()) return;
    const text = chatText;
    setChatText("");

    try {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.error("Failed to send chat message:", err);
      setChatText(text);
    }
  };

  const deleteChatMessage = async (messageId: string) => {
    try {
      await fetch(`/api/chat/message/${messageId}`, {
        method: "DELETE",
      });
      loadChatMessages();
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const loadNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
    setNotifLoading(false);
  };

const markNotificationRead = async (notifId: string) => {
  setUnreadNotifications(prev => Math.max(0, prev - 1));
  setNotifications(prev =>
    prev.map(n =>
      n.id === notifId ? { ...n, isRead: true } : n
    )
  );

  await fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: notifId }),
  });
};

  const clearAllNotifications = async () => {
    try {
      await fetch("/api/notifications/clear", {
        method: "POST",
      });
      loadNotifications();
      loadUnreadCounts();
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

const loadUnreadCounts = async () => {
  const res = await fetch("/api/unread-counts", {
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json();
    setUnreadNotifications(data.notifications || 0);
    setUnreadDM(data.messages || 0);
  }
};

  const handleUserSearch = async (text: string) => {
    setSearchDMText(text);
    if (!text) {
      setSearchUsers([]);
      return;
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  useEffect(() => {
    if (!user) return;

    setProfileUsername(user.username || "");
    setProfileEmail(user.email || "");
    loadUnreadCounts();

    //const interval = setInterval(loadUnreadCounts, 30000);
    //return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (activePage === "dm") {
      loadDMUsers();
    } else if (activePage === "chat") {
      loadChatMessages();
    } else if (activePage === "notifications") {
      loadNotifications();
    }
  }, [activePage]);

  useEffect(() => {
  if (!user) return;
  // 🔥 EZ A LÉNYEG:
  loadDMUsers();
}, [user]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadThreads();
  }, [selectedCategory]);

  useEffect(() => {
    if (!activeThread) return;
    loadThread(activeThread.id);
  }, [activeThread?.id]);

  useEffect(() => {
    if (showNewTopicPopup && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [showNewTopicPopup, categories]);

  // ------------------------- Actions -------------------------
  const handleAddReply = async () => {
    if (!newReply.trim() || !activeThread) return;

    try {
      await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread.id,
          text: newReply,
        }),
      });

      setNewReply("");
      loadThread(activeThread.id);
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicTitle.trim() || !selectedCategory || selectedCategory === "all") return;

    await fetch("/api/threads", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTopicTitle,
        excerpt: newTopicBody,
        categoryId: selectedCategory,
      }),
    });

    setShowNewTopicPopup(false);
    setNewTopicBody("");
    setNewTopicTitle("");
    loadThreads();
  };

  const toggleLike = async (postId: string) => {
  setPosts(prev =>
    prev.map(p => {
      if (p.id !== postId) return p;

      const liked = p.userLiked;
      return {
        ...p,
        userLiked: !liked,
        likesCount: liked ? p.likesCount - 1 : p.likesCount + 1,
      };
    })
  );

  try {
    await fetch("/api/posts/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
  } catch {
    // rollback
    if (activeThread) loadThread(activeThread.id);
  }
};


  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profileUsername,
          email: profileEmail,
          password: profilePassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ismeretlen hiba történt.");
      }

      setProfilePassword("");
      setProfileSuccess("Profil sikeresen mentve.");
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Nem sikerült frissíteni a profilt.");
    } finally {
      setSavingProfile(false);
    }
  };

  // avatar file input -> csak cropper nyitás
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("A fájl mérete maximum 2 MB lehet.");
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!cropSrc || !croppedAreaPixels) return;

    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.png");

      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nem sikerült frissíteni az avatart.");
      }

      setProfileSuccess("Avatar sikeresen frissítve.");
      setShowCropper(false);
      setCropSrc(null);
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Nem sikerült frissíteni az avatart.");
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
  };

// ------------------------- Render -------------------------
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
      Betöltés...
    </div>
  );
}

return (
  <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
    <Sidebar
      activePage={activePage}
      setActivePage={setActivePage}
      unreadNotifications={unreadNotifications}
      unreadDM={unreadDM}
    />

    {/* ================= MAIN CONTENT ================= */}
    <div className="flex-1 min-h-0 p-4 md:p-6 flex flex-col gap-6 overflow-hidden">
      <Topbar user={user} />

      {/* ================= HOME ================= */}
      {activePage === "home" && (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">

          {/* -------- Categories -------- */}
          <div className="md:w-64 w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 flex flex-col gap-4 md:h-full max-h-64 md:max-h-none overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg md:text-xl font-semibold">Kategóriák</h2>
              <button
                onClick={() => setShowNewTopicPopup(true)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition"
              >
                +
              </button>
            </div>

            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg transition ${
                selectedCategory === "all"
                  ? "bg-white/20"
                  : "hover:bg-white/20"
              }`}
            >
              Összes
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg transition ${
                  selectedCategory === cat.id
                    ? "bg-white/20"
                    : "hover:bg-white/20"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* -------- Threads / Thread View -------- */}
          <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 overflow-y-auto">

            {/* THREAD LIST */}
            {!activeThread && (
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-4">
                  Legújabb témák
                </h2>

                <div className="flex flex-col gap-4">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setActiveThread(thread)}
                      className="bg-white/10 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/20 transition"
                    >
                      <div className="flex justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">
                            {thread.title}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {thread.excerpt}
                          </p>
                        </div>

                        <div className="text-right text-sm">
                          <p className="text-white/70">
                            Hozzászólások: {thread._count?.posts ?? 0}
                          </p>
                          <p className="text-lime-300">
                            {thread.category?.name ?? "Kategória nélkül"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* SINGLE THREAD */}
            {activeThread && (
              <div className="flex flex-col gap-6">
                <button
                  onClick={() => setActiveThread(null)}
                  className="text-sm text-lime-400 hover:text-lime-300"
                >
                  ← Vissza a témákhoz
                </button>

                <h1 className="text-2xl font-bold">
                  {activeThread.title}
                </h1>

                <p className="text-sm text-white/80">
                  Kategória:{" "}
                  <span className="text-lime-300">
                    {activeThread.category?.name ?? "?"}
                  </span>
                </p>

                <div className="flex flex-col gap-6 border-t border-white/20 pt-6">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-black/20 p-4 rounded-xl"
                    >
                      <div className="flex justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                            {post.author.avatarUrl ? (
                              <img
                                src={post.author.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold">
                                {post.author.username[0].toUpperCase()}
                              </span>
                            )}
                          </div>

                          <span className="font-semibold text-lime-300">
                            {post.author.username}
                          </span>

                          <small className="text-white/50">
                            {new Date(post.createdAt).toLocaleDateString("hu-HU")}
                          </small>
                        </div>

                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`p-1 rounded-full ${
                            post.userLiked
                              ? "bg-red-500/80"
                              : "bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                      </div>

                      <p className="whitespace-pre-wrap text-white/90">
                        {post.text}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ADD REPLY */}
                <div className="border-t border-white/20 pt-6">
                  <h3 className="text-xl font-bold mb-3">Válasz írása</h3>
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    className="w-full h-32 bg-white/10 p-3 rounded-lg text-white"
                  />
                  <button
                    onClick={handleAddReply}
                    disabled={!newReply.trim()}
                    className="mt-3 bg-lime-500 px-6 py-2 rounded-lg font-semibold text-black disabled:bg-white/20"
                  >
                    Elküldés
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* ------- Global Chat Page ------- */}
{activePage === "chat" && (
  <div className="flex-1 flex flex-col min-h-0">
    <GlobalChat 
  user={user}
  messages={chatMessages}
  setMessages={setChatMessages}
/>
  </div>
)}

        {/* ------- DM Page ------- */}
        {activePage === "dm" && (
            <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 overflow-hidden">
                {/* Conversations List */}
<div className="md:w-64 w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 flex flex-col gap-4 md:h-full max-h-64 md:max-h-none overflow-y-auto">

  <h2 className="text-lg md:text-xl font-semibold mb-2">Beszélgetések</h2>

  <input
    type="text"
    value={searchDMText}
    onChange={(e) => handleUserSearch(e.target.value)}
    placeholder="Keresés..."
    className="w-full pl-3 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400 mb-2"
  />

  {searchUsers.length > 0 && (
    <div className="border-b border-white/20 pb-2 mb-2">
      <p className="text-xs text-lime-300 mb-1">Keresési találatok:</p>
      {searchUsers.map((u: any) => (
        <button
          key={u.id}
          onClick={() => {
  setActiveDM(u.id);
  setSearchDMText("");
  setSearchUsers([]);
}}

          className="w-full text-left justify-start text-white hover:bg-white/20 px-3 py-2 rounded-lg transition flex items-center gap-2"
        >
          <User className="w-4 h-4" /> {u.username}
        </button>
      ))}
    </div>
  )}

  {/* ONLINE USERS */}
  <div className="border-b border-white/20 pb-2 mb-2">
    <p className="text-xs text-lime-300 mb-1">Online felhasználók:</p>
    {onlineUsers.filter(id => id !== user.id).map(id => {
      const u = allUsers.find(us => us.id === id);
      if (!u) return null;
      return (
        <button
          key={u.id}
          onClick={() => setActiveDM(u.id)}
          className="w-full text-left justify-start text-white hover:bg-lime-400/20 px-3 py-2 rounded-lg transition flex items-center gap-2"
        >
          <User className="w-4 h-4" /> {u.username}
        </button>
      );
    })}
  </div>

  {dmLoading ? (
    <p className="text-white/50 italic">Betöltés...</p>
  ) : dmUsers.length === 0 ? (
    <p className="text-white/50 italic">Nincs aktív beszélgetés.</p>
  ) : (
dmUsers.map((conv: any) => {
  const partner = conv.partner;
  if (!partner) return null;

  const active = activeDM === partner.id;
  const unread = conv.unreadCount > 0;

  return (
    <button
      key={partner.id}
      onClick={() => setActiveDM(partner.id)}
      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 ${
        active ? "bg-white/20" : "hover:bg-white/20"
      }`}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          onlineUsers.includes(partner.id)
            ? "bg-lime-400"
            : "bg-white/40"
        }`}
      />
      <span className="truncate flex-1">{partner.username}</span>

      {unread && (
        <span className="w-4 h-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center font-bold">
          {conv.unreadCount}
        </span>
      )}
    </button>
  );
})
  )}
</div>

{/* Message View */}
<div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 flex flex-col h-full overflow-hidden">
  {!activeDM ? (
    <div className="flex-1 flex items-center justify-center text-white/50">
      Válasszon egy felhasználót a beszélgetéshez.
    </div>
  ) : (
    <div className="flex flex-col flex-1 min-h-0">
      {/* DM HEADER */}
      <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
        {(() => {
          const partner = allUsers.find((u: any) => u.id === activeDM);
          return (
            <h3 className="text-xl font-bold">
              Beszélgetés: {partner?.username ?? "..."}
            </h3>
          );
        })()}

        <button
          onClick={() => {
            setActiveDM(null);
            setDMMessages([]);
            setDMTypingUser(null);
          }}
          title="Bezárás"
          className="p-2 bg-red-500/80 hover:bg-red-600 text-black rounded-lg transition flex items-center"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* DM EDIT POPUP */}
{editingDM && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-4 rounded-2xl w-80">
      <h3 className="font-semibold mb-2">Üzenet szerkesztése</h3>

      <textarea
        value={editingDMText}
        onChange={(e) => setEditingDMText(e.target.value)}
        className="w-full bg-black/30 p-2 rounded-lg text-white border border-white/30"
        rows={3}
      />

      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => setEditingDM(null)}
          className="text-white/70 hover:text-white"
        >
          Mégse
        </button>

        <button
          onClick={async () => {
            if (!editingDMText.trim()) return;

            await fetch(`/api/dm/message/${editingDM.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: editingDMText }),
});

            setEditingDM(null);
            setEditingDMText("");
          }}
          className="bg-lime-500 px-3 py-1 rounded text-black hover:bg-lime-600"
        >
          Mentés
        </button>
      </div>
    </div>
  </div>
)}

{/* DM MESSAGES */}
<div
  ref={dmListRef}
  className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 mb-4"
>
  {dmMessages.map((msg: any) => {
    const isMe = msg.fromId === user.id;

    return (
      <div
        key={msg.id}
        className={`p-2 rounded-lg max-w-[80%] ${
          isMe ? "self-end bg-lime-700/50" : "self-start bg-white/10"
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center gap-2 mb-1">
          <b className={isMe ? "text-lime-300" : ""}>
            {isMe ? "Én" : msg.from?.username}
          </b>
          <small className="text-white/50">
  {formatChatDate(msg.createdAt)}
</small>

        </div>

        {/* TARTALOM */}
        {msg.revoked ? (
          <i className="text-white/50">Az üzenet visszavonva</i>
        ) : (
          <>
            <div className="text-sm whitespace-pre-wrap">{msg.text}</div>

            {msg.editCount > 0 && (
              <div
                className="text-[10px] text-white/40 mt-1"
                title={`Szerkesztve: ${new Date(msg.editedAt).toLocaleString("hu-HU")}`}
              >
                (szerkesztve)
              </div>
            )}
          </>
        )}

        {/* ACTIONS */}
        {isMe && !msg.revoked && (
          <div className="flex gap-1 mt-1 opacity-70 hover:opacity-100 transition">
            {(msg.editCount ?? 0) < 3 && (
              <button
                onClick={() => {
                  setEditingDM(msg);
                  setEditingDMText(msg.text ?? "");
                }}
                title={`Szerkesztés (${msg.editCount}/3)`}
                className="p-1 rounded hover:bg-white/20 text-blue-300"
              >
                ✏️
              </button>
            )}

            <button
              onClick={() => revokeDM(msg.id)}
              title="Üzenet visszavonása"
              className="p-1 rounded hover:bg-red-500/20 text-red-400"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  })}
</div>   {/* 🔥 EZ HIÁNYZOTT */}


{/* DM INPUT */}
<div className="flex gap-2 shrink-0">

        <input
          value={dmText}
          onChange={(e) => setDMText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Írj privát üzenetet..."
          className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <button
          onClick={sendMessage}
          disabled={!dmText.trim()}
          className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Send className="w-4 h-4" /> Küldés
        </button>
      </div>
    </div>
  )}
</div>
</div>
        )}

        
        {/* ------- Notifications Page ------- */}
        {activePage === "notifications" && (
            <div className="flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold">Értesítések</h2>
                    <button
                        onClick={clearAllNotifications}
                        className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                        title="Összes törlése"
                    >
                        <Trash2 className="w-4 h-4" /> Összes törlése
                    </button>
                </div>

                {notifLoading ? (
                    <p className="text-white/50 italic">Betöltés...</p>
                ) : notifications.length === 0 ? (
                    <p className="text-white/50 italic">Nincsenek új értesítések.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map((n: any) => (
                            <div 
                                key={n.id} 
                                className={`p-3 rounded-lg border ${n.isRead ? 'bg-white/5 border-white/10' : 'bg-lime-700/20 border-lime-500/50'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
  {n.title && (
    <p className="font-semibold text-sm mb-0.5">
      {n.title}
    </p>
  )}
  <p className="text-sm md:text-base">
    {n.message}
  </p>
</div>

                                    <button 
                                        onClick={() => markNotificationRead(n.id)}
                                        className="text-xs text-lime-400 hover:text-lime-300 ml-4 flex-shrink-0"
                                    >
                                        {n.isRead ? 'Olvasott' : 'Megjelölés olvasottként'}
                                    </button>
                                </div>
                                <small className="text-white/50 block mt-1">
                                    {new Date(n.createdAt).toLocaleDateString("hu-HU")} {new Date(n.createdAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                                </small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* ------- Profile Page ------- */}
{activePage === "profile" && user && (
  <div className="h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 overflow-y-auto">
    <h2 className="text-xl md:text-2xl font-bold border-b border-white/20 pb-3 mb-6">
      Profil beállítások
    </h2>

    {/* Status messages */}
    {profileError && (
      <div className="p-3 bg-red-600/50 rounded-lg text-red-200 mb-4">
        {profileError}
      </div>
    )}
    {profileSuccess && (
      <div className="p-3 bg-lime-600/50 rounded-lg text-lime-200 mb-4">
        {profileSuccess}
      </div>
    )}

    {/* GRID */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">

      {/* ========== LEFT COLUMN ========== */}
      <div className="lg:col-span-1 flex flex-col gap-6">

        {/* Profile card */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative w-28 h-28 rounded-full bg-black/50 overflow-hidden border-4 border-lime-400/50">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  className="w-full h-full object-cover"
                  alt="Avatar"
                />
              ) : (
                <span className="text-4xl font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div>
              <p className="text-xl font-bold">{user.username}</p>
              <p className="text-sm text-lime-300">
                {user.role === "MODERATOR"
                  ? "Moderátor"
                  : user.role === "ADMIN"
                  ? "Admin"
                  : "Felhasználó"}
              </p>
              <p className="text-xs text-white/60 mt-1">
                Csatlakozott:{" "}
                {new Date(user.joinedAt).toLocaleDateString("hu-HU")}
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 Stats card – MOST JÓ HELYEN */}
        <ProfileStatsCard user={user} />
      </div>

      {/* ========== RIGHT COLUMN ========== */}
      <div className="lg:col-span-2 bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4">Profil adatok</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-white/70">Felhasználónév</span>
            <input
              type="text"
              value={profileUsername}
              onChange={(e) => setProfileUsername(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg mt-1 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </label>

          <label className="block">
            <span className="text-white/70">Email cím</span>
            <input
              type="email"
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg mt-1 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="text-white/70">
              Új jelszó (hagyja üresen)
            </span>
            <input
              type="password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              className="w-full bg-white/10 p-3 rounded-lg mt-1 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </label>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-6 bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-6 py-2 rounded-lg font-semibold transition"
        >
          {savingProfile ? "Mentés..." : "Profil mentése"}
        </button>
      </div>
    </div>
  </div>
)}
        
        {/* NEW TOPIC POPUP */}
        {showNewTopicPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-2xl w-full max-w-lg">
              <div className="flex justify-between items-center border-b border-white/20 pb-3 mb-4">
                <h3 className="text-xl font-bold">Új téma indítása</h3>
                <button onClick={() => setShowNewTopicPopup(false)}>
                  <X className="w-6 h-6 text-white/70 hover:text-white" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <label className="block">
                  <span className="text-white/70">Kategória</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-white/10 p-3 rounded-lg mt-1 text-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                  >
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-white/70">Cím</span>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="A téma címe"
                    className="w-full bg-white/10 p-3 rounded-lg mt-1 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </label>

                <label className="block">
                  <span className="text-white/70">Leírás/Bevezető</span>
                  <textarea
                    value={newTopicBody}
                    onChange={(e) => setNewTopicBody(e.target.value)}
                    placeholder="A téma rövid leírása (markdown támogatott)"
                    className="w-full h-32 bg-white/10 p-3 rounded-lg mt-1 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowNewTopicPopup(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-white/30 hover:bg-white/10"
                >
                  Mégse
                </button>
                <button
                  onClick={handleAddTopic}
                  disabled={!newTopicTitle.trim() || !newTopicBody.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-lime-500 hover:bg-lime-600 text-black font-semibold disabled:bg-white/20 disabled:text-white/40"
                >
                  Téma indítása
                </button>
              </div>
            </div>
          </div>
        )}
        
        
        {/* AVATAR CROPPER POPUP */}
        {showCropper && cropSrc && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-2xl w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 border-b border-white/20 pb-3">Avatar Vágása</h3>
              
              <div className="relative w-full h-80 bg-black/30 rounded-lg overflow-hidden">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs text-white/70 w-16">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleCropCancel}
                  className="px-4 py-2 text-sm rounded-lg border border-white/30 hover:bg-white/10"
                >
                  Mégse
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-4 py-2 text-sm rounded-lg bg-lime-500 hover:bg-lime-600 text-black font-semibold"
                >
                  Mentés
                </button>
              </div>
                            </div>
            </div>
        )}

      </div>
    </div> 
  );
}