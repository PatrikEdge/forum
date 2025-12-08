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

// ================== GLOBAL CHAT COMPONENT ==================
function GlobalChat({ user, messages, setMessages }: { 
  user: any, 
  messages: any[], 
  setMessages: any 
}) {
  const ws = useWebSocket();
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);

  // ---- Edit state ----
  const [editMessage, setEditMessage] = useState<any>(null);
  const [editText, setEditText] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);

  const REACTIONS = ["❤️", "😆", "👍", "😡", "😢", "😮"];

  // ---- Typing ----
  function sendTyping() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "typing", chat: "global" }));
  }

  // ---- Reactions ----
  function toggleReaction(messageId: string, emoji: string) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "chat_reaction", messageId, emoji }));
  }

  // ---- Editing ----
  function startEdit(msg: any) {
    setEditMessage(msg);
    setEditText(msg.text);
  }

  function saveEdit() {
    if (!editMessage || !editText.trim() || !ws) return;

    ws.send(JSON.stringify({
      type: "chat_edit",
      id: editMessage.id,
      text: editText.trim(),
    }));

    setEditMessage(null);
    setEditText("");
  }

  // WS LISTENER (REACTIONS + EDIT + TYPING)
  useEffect(() => {
    if (!ws) return;

    function onMessage(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data);

        // ---- Global message ----
        if (data.type === "global_message") {
          setMessages((prev: any[]) => [...prev, data.message]);
          return;
        }

        // ---- Typing ----
        if (data.type === "typing" && data.chat === "global") {
          if (data.userId !== user.id) {
            setTypingUser(data.username);
            setTimeout(() => setTypingUser(null), 3000);
          }
          return;
        }

        // ---- Reactions ----
        if (data.type === "chat_reaction") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.messageId ? { ...m, reactions: data.reactions } : m
            )
          );
          return;
        }

        // ---- Edit ----
        if (data.type === "chat_edit") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message.id ? data.message : m
            )
          );
          return;
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    }

    ws.addEventListener("message", onMessage);
    return () => ws.removeEventListener("message", onMessage);
  }, [ws, user.id, setMessages]);

  // AUTO-SCROLL
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // SEND MESSAGE
  function handleSend() {
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "global_message", text: msg }));
      return;
    }
  }

  return (
    <div className="flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
      <div className="border-b border-white/20 p-4">
        <h2 className="text-xl font-bold">🌍 Globális Chat</h2>
        <p className="text-sm text-white/70">Beszélgetés valós időben</p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const myReaction = msg.reactions?.find((r: any) => r.userId === user.id);

          return (
            <div key={msg.id} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
              <div className="flex items-center gap-2 mb-1">
                <b>{msg.author?.username}</b>
                <small className="text-white/50">
                  {new Date(msg.createdAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
                </small>

                {/* EDIT BUTTON */}
                {msg.authorId === user.id && (
                  <button
                    onClick={() => startEdit(msg)}
                    className="text-xs text-blue-300 hover:text-blue-200"
                    title="Szerkesztés"
                  >
                    ✏️
                  </button>
                )}
              </div>

              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>

              {/* EDITED LABEL */}
              {msg.edited && (
                <small className="text-white/40 text-[10px]">szerkesztve</small>
              )}

              {/* REACTIONS */}
              <div className="flex gap-1 mt-1">
                {REACTIONS.map((emoji) => {
                  const active = myReaction?.emoji === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className={`text-sm px-1 rounded transition ${
                        active ? "bg-lime-500/40" : "hover:bg-white/20"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              {/* SHOW COUNTS */}
              {msg.reactions?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 text-xs">
                  {msg.reactions.map((r: any, i: number) => (
                    <span key={i} className="px-1 rounded bg-white/20">
                      {r.emoji} x{r.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {typingUser && (
        <div className="p-2 text-sm text-white/70 italic">
          💬 {typingUser} éppen ír...
        </div>
      )}

      <div className="border-t border-white/20 p-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            sendTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Írj üzenetet..."
          className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
        />

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
              className="w-full bg-black/30 p-2 rounded-lg"
            />

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditMessage(null)} className="text-white/70 hover:text-white">
                Mégse
              </button>
              <button
                onClick={saveEdit}
                className="bg-lime-500 px-3 py-1 rounded text-black"
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

  // Global Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  // WS: presence + DM
  useEffect(() => {
    if (!ws) return;

    function onMessage(ev: MessageEvent) {
      try {
        const data = JSON.parse(ev.data);

        if (data.type === "presence_snapshot") {
          setOnlineUsers(Array.isArray(data.users) ? data.users : []);
          return;
        }

        if (data.type === "presence_update") {
          setOnlineUsers((prev) => {
            const set = new Set(prev);
            if (data.status === "online") set.add(data.userId);
            else if (data.status === "offline") set.delete(data.userId);
            return Array.from(set);
          });
          return;
        }

        if (data.type === "dm_message") {
          const m = data.message;
          if (activeDM && (m.fromId === activeDM || m.toId === activeDM)) {
            setDMMessages((prev: any[]) => [...prev, m]);
          }
          loadDMUsers();
          loadUnreadCounts();
          return;
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    }

    ws.addEventListener("message", onMessage);
    return () => ws.removeEventListener("message", onMessage);
  }, [ws, activeDM]);

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

  const loadConversation = async (userId: string) => {
    setActiveDM(userId);
    try {
      const res = await fetch(`/api/dm/messages/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setDMMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const sendMessage = () => {
    if (!dmText || !activeDM || !ws) return;
    const text = dmText;
    setDMText("");

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "dm_message", toId: activeDM, text }));
      return;
    }

    fetch("/api/dm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: activeDM, text }),
    }).then(() => loadConversation(activeDM));
  };

  const loadChatMessages = async () => {
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
      loadChatMessages();
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
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: "POST",
      });
      loadNotifications();
      loadUnreadCounts();
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
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
    try {
      const res = await fetch("/api/unread-counts");
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifications(data.notifications || 0);
        setUnreadDM(data.messages || 0);
      }
    } catch (err) {
      console.error("Failed to load unread counts:", err);
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

    const interval = setInterval(loadUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (activePage === "dm") {
      loadDMUsers();
    } else if (activePage === "chat") {
      loadChatMessages();
      const interval = setInterval(loadChatMessages, 5000);
      return () => clearInterval(interval);
    } else if (activePage === "notifications") {
      loadNotifications();
    }
  }, [activePage]);

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
    try {
      await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (activeThread) loadThread(activeThread.id);
    } catch (err) {
      console.error("Failed to toggle like:", err);
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
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        unreadNotifications={unreadNotifications}
        unreadDM={unreadDM}
      />

      <div className="flex-1 p-4 md:p-6 flex flex-col gap-6">
        <Topbar user={user} />

        {/* ------- Home Page ------- */}
        {activePage === "home" && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
            {/* Categories */}
            <div className="md:w-64 w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 flex flex-col gap-4 md:h-full max-h-64 md:max-h-none overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg md:text-xl font-semibold">Kategóriák</h2>
                <button
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition"
                  onClick={() => setShowNewTopicPopup(true)}
                >
                  +
                </button>
              </div>
              <button
                className={`justify-start text-white hover:bg-white/20 px-4 py-2 rounded-lg transition ${
                  selectedCategory === "all" ? "bg-white/20" : ""
                }`}
                onClick={() => setSelectedCategory("all")}
              >
                Összes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`justify-start text-white hover:bg-white/20 px-4 py-2 rounded-lg transition ${
                    selectedCategory === cat.id ? "bg-white/20" : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Threads / Thread View */}
            <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 overflow-y-auto">
              {!activeThread && (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-4">Legújabb témák</h2>
                  <div className="flex flex-col gap-4">
                    {threads.map((thread) => (
                      <div
                        key={thread.id}
                        className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/20 transition"
                        onClick={() => setActiveThread(thread)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-lg md:text-xl font-semibold mb-1">
                              {thread.title}
                            </h3>
                            <p className="text-white/80 text-sm md:text-base mb-2">
                              {thread.excerpt}
                            </p>
                            <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-white/70">
                              <span>Szerző: {thread.author.username}</span>
                              {thread.isPinned && (
                                <span className="text-lime-300 flex items-center gap-1">
                                  <Pin className="w-3 h-3" /> Kiemelt
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {threads.length === 0 && (
                      <p className="text-sm text-white/70">Nincs még téma ebben a kategóriában.</p>
                    )}
                  </div>
                </>
              )}

              {activeThread && (
                <div className="flex flex-col gap-4">
                  <button
                    className="text-xs md:text-sm text-white/70 hover:text-white mb-2 self-start"
                    onClick={() => setActiveThread(null)}
                  >
                    ← Vissza a listához
                  </button>

                  <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                    <h2 className="text-xl md:text-2xl font-bold mb-1">{activeThread.title}</h2>
                    <p className="text-white/80 text-sm md:text-base mb-2">
                      {activeThread.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-white/70">
                      <span>Szerző: {activeThread.author.username}</span>
                      {activeThread.isPinned && (
                        <span className="text-lime-300 flex items-center gap-1">
                          <Pin className="w-3 h-3" /> Kiemelt
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 md:pr-2">
                    {posts.map((p) => (
                      <div key={p.id} className="border-b border-white/20 pb-3 md:pb-4 text-sm md:text-base">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                              {p.author.avatarUrl ? (
                                <img src={p.author.avatarUrl} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="text-[10px]">
                                  {p.author.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="font-semibold text-xs md:text-sm">
                              {p.author.username}
                            </span>
                            {p.author.role === "MODERATOR" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/80 text-black">
                                MOD
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="mb-2 whitespace-pre-wrap">{p.text}</p>
                        <button
                          className={`inline-flex items-center gap-1 text-[11px] md:text-xs px-2 py-1 rounded-full border transition ${
                            p.likes.some((l: any) => l.userId === user.id)
                              ? "border-lime-400 bg-lime-500/20 text-lime-300"
                              : "border-white/30 text-white/80 hover:bg-white/10"
                          }`}
                          onClick={() => toggleLike(p.id)}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{p.likes.length}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Reply Editor */}
                  <div className="mt-2 flex flex-col gap-2">
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Válasz írása..."
                      className="bg-white/20 text-white placeholder:text-white/60 rounded-xl p-3 text-sm md:text-base min-h-[80px] border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddReply}
                        className="bg-lime-500 hover:bg-lime-600 text-black px-4 py-2 rounded-lg font-semibold transition"
                      >
                        Küldés
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------- Global Chat Page ------- */}
        {activePage === "chat" && (
          <GlobalChat user={user} messages={chatMessages} setMessages={setChatMessages} />
        )}

        {/* ------- DM Page ------- */}
        {activePage === "dm" && (
          <div className="flex w-full h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            {/* DM Sidebar */}
            <div className="w-1/3 border-r border-white/20 p-4 flex flex-col gap-3 overflow-y-auto">
              <input
                value={searchDMText}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Felhasználó keresése..."
                className="bg-white/20 text-white placeholder:text-white/60 rounded-lg px-3 py-2 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />

              {searchUsers.length > 0 && (
                <div className="flex flex-col gap-2">
                  {searchUsers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => loadConversation(u.id)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-3 transition text-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span>{u.username}</span>

                      {onlineUsers.includes(u.id) && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-lime-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {dmLoading ? (
                  <p className="text-sm text-white/60">Betöltés...</p>
                ) : dmUsers.length === 0 ? (
                  <p className="text-sm text-white/60">Nincsenek beszélgetések.</p>
                ) : (
                  dmUsers.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => loadConversation(u.id)}
                      className={`p-2 rounded-lg flex items-center gap-3 transition text-sm ${
                        activeDM === u.id
                          ? "bg-lime-500/50 text-black"
                          : "bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span>{u.username}</span>

                      {onlineUsers.includes(u.id) && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-lime-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* DM Conversation */}
            <div className="flex-1 flex flex-col">
              {!activeDM && (
                <div className="flex flex-1 items-center justify-center text-white/70 text-sm">
                  📬 Válassz egy beszélgetést!
                </div>
              )}

              {activeDM && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {dmMessages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[70%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                          m.fromId === user.id
                            ? "self-end bg-lime-500 text-black"
                            : "self-start bg-white/20"
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/20 p-4 flex gap-2">
                    <input
                      value={dmText}
                      onChange={(e) => setDMText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())
                      }
                      placeholder="Írj üzenetet..."
                      className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={!dmText.trim()}
                      className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-4 py-2 rounded-lg font-semibold transition"
                    >
                      <Send className="w-4 h-4" /> Küldés
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ------- Notifications Page ------- */}
        {activePage === "notifications" && (
          <div className="flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="border-b border-white/20 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Értesítések</h2>
                <p className="text-sm text-white/70">
                  {notifications.filter((n) => !n.isRead).length} olvasatlan értesítés
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-white/70 hover:text-white transition"
                >
                  Összes törlése
                </button>
              )}
            </div>

            {notifLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/70">Betöltés...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/70">
                    <Bell className="w-16 h-16 mb-4 opacity-50" />
                    <p>Nincsenek értesítéseid</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          notif.isRead
                            ? "bg-white/5 border-white/10"
                            : "bg-white/10 border-lime-400/50"
                        }`}
                        onClick={() => !notif.isRead && markNotificationRead(notif.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1">{notif.title}</p>
                            <p className="text-sm text-white/80 mb-2">{notif.message}</p>
                            <span className="text-[11px] text-white/50">
                              {new Date(notif.createdAt).toLocaleString("hu-HU")}
                            </span>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 rounded-full bg-lime-400"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ------- Profile Page ------- */}
        {activePage === "profile" && user && (
          <div className="flex flex-col md:flex-row gap-6 h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            {/* LEFT: Avatar */}
            <div className="w-full md:w-1/3 flex flex-col items-center text-center gap-4">
              <div
                className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-3xl md:text-4xl cursor-pointer group"
                onClick={() => document.getElementById("avatarInput")?.click()}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  (user?.username?.charAt(0)?.toUpperCase() ?? "?")
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs md:text-sm">
                  Avatar módosítása
                </div>
              </div>

              <div>
                <p className="text-xl md:text-2xl font-bold">{user.username}</p>
                <p className="text-lime-300 text-sm md:text-base">
                  {user.role === "MODERATOR"
                    ? "Moderátor"
                    : user.role === "ADMIN"
                    ? "Admin"
                    : "Felhasználó"}
                </p>
                <p className="text-xs md:text-sm text-white/70 mt-1">
                  {onlineUsers.includes(user.id) ? "🟢 Online" : "⚫ Offline"}
                </p>
              </div>

              {/* Rejtett / kicsi input + gomb */}
              <div className="flex flex-col items-center gap-2 text-sm">
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById("avatarInput")?.click()}
                  className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 border border-white/30"
                >
                  Új avatar feltöltése
                </button>
                <p className="text-[11px] text-white/60">Max 2MB · katt a képre is működik</p>
              </div>
            </div>

            {/* RIGHT: Settings */}
            <div className="flex-1 flex flex-col gap-4 text-sm md:text-base">
              <div className="bg-white/10 border-white/20 border p-4 rounded-2xl">
                <h3 className="font-semibold mb-3">Profil adatok szerkesztése</h3>

                {profileError && (
                  <p className="text-sm text-red-300 mb-2">{profileError}</p>
                )}
                {profileSuccess && (
                  <p className="text-sm text-lime-300 mb-2">{profileSuccess}</p>
                )}

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-white/80 text-sm">Felhasználónév</label>
                    <input
                      value={profileUsername}
                      onChange={(e) => setProfileUsername(e.target.value)}
                      className="w-full bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>

                  <div>
                    <label className="text-white/80 text-sm">E-mail cím</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>

                  <div>
                    <label className="text-white/80 text-sm">Új jelszó</label>
                    <input
                      type="password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Ha üres, nem változik"
                      className="w-full bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-6 py-2 rounded-lg font-semibold transition"
                    >
                      {savingProfile ? "Mentés..." : "Mentés"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 border-white/20 border p-4 rounded-2xl">
                <h3 className="font-semibold mb-2">Moderátori eszközök</h3>
                {user.role === "MODERATOR" || user.role === "ADMIN" ? (
                  <ul className="text-sm opacity-80 space-y-1">
                    <li>• Chat üzenetek törlése</li>
                    <li>• Témák zárolása / kiemelése</li>
                    <li>• Felhasználók figyelmeztetése</li>
                  </ul>
                ) : (
                  <p className="text-sm text-white/70">Nincs moderátori jogosultságod.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------- New Topic Modal ------- */}
        {showNewTopicPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-2xl w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Új téma hozzáadása</h3>
                <button
                  onClick={() => setShowNewTopicPopup(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                placeholder="Téma címe..."
                className="w-full mb-3 bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />

              <textarea
                value={newTopicBody}
                onChange={(e) => setNewTopicBody(e.target.value)}
                placeholder="Leírás..."
                className="w-full mb-4 bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400 min-h-[100px]"
              />

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full mb-4 bg-white/20 text-white px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
              >
                <option value="all" disabled>
                  Válassz kategóriát...
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2">
                <button
                  className="text-white hover:bg-white/10 px-4 py-2 rounded-lg transition"
                  onClick={() => setShowNewTopicPopup(false)}
                >
                  Mégse
                </button>
                <button
                  className="bg-lime-500 hover:bg-lime-600 text-black px-4 py-2 rounded-lg font-semibold transition"
                  onClick={handleAddTopic}
                >
                  Hozzáadás
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------- Avatar Cropper Modal ------- */}
        {showCropper && cropSrc && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 w-full max-w-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Avatar kivágása</h3>
                <button onClick={handleCropCancel} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
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