// --- FULL FORUM APP (FRONTEND-ONLY, BACKEND-READY) ---
// Funkciók:
// - Fórum (kategóriák, témák, thread nézet, válaszok, új téma popup)
// - Globális chat buborékokkal, avatarokkal, moderátor törlés, hover usercard
// - Privát üzenetek (DM) oldal: felhasználó keresés + beszélgetés panel
// - Értesítések oldal: olvasott/olvasatlan, badge a csengőn
// - Profil oldal: név, email, jelszó mező, avatar feltöltés (2MB limit)
// - Like (szavazás) posztokra (lokális állapotban)
// - Egyszerű "rich text" válasz editor (markdown-szerű formázás gombokkal)

import React, { useState } from "react";
import { Home, User, MessageCircle, Bell, Search, ThumbsUp, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

//------------------------------------------------------
// SIDEBAR COMPONENT
//------------------------------------------------------
function Sidebar({ activePage, setActivePage, unreadNotifications, unreadDM }) {
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
                "w-6 h-6 transition-transform animate-pulse " +
                (active
                  ? "text-lime-300 scale-110 drop-shadow-lg"
                  : "opacity-80 hover:opacity-100 hover:scale-110")
              }
            />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-black" />
            )}
          </button>
        );
      })}
    </aside>
  );
}

//------------------------------------------------------
// TOPBAR (USER + SEARCH)
//------------------------------------------------------
function Topbar({ currentUser }) {
  return (
    <div className="flex items-center justify-between bg-white/10 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-white/20 shadow-lg">
      <div className="relative w-2/3 md:w-1/2">
        <Input
          placeholder="Keresés..."
          className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70" />
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="bg-white/20 w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex items-center justify-center">
          {currentUser.avatarUrl ? (
            <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="text-xs md:text-sm text-right">
          <p className="font-semibold">{currentUser.name}</p>
          <p className="text-lime-300 text-[11px] md:text-xs">
            {currentUser.isModerator ? "Moderátor" : "Felhasználó"}
          </p>
        </div>
      </div>
    </div>
  );
}

//------------------------------------------------------
// MAIN ROOT COMPONENT
//------------------------------------------------------
export default function ForumUI() {
  const [activePage, setActivePage] = useState("home");

  const [currentUser, setCurrentUser] = useState({
    id: "me",
    name: "Te",
    email: "te@example.com",
    isModerator: true,
    avatarUrl: "",
    joinedAt: "2023.05.12",
  });

  // Fórum állapotok
  const [categories] = useState([
    { id: "general", name: "Általános" },
    { id: "tech", name: "Technológia" },
    { id: "dev", name: "Programozás" },
    { id: "gaming", name: "Gaming" },
    { id: "design", name: "Design" },
  ]);

  const [threads, setThreads] = useState([
    {
      id: 101,
      categoryId: "general",
      title: "Kertészkedés kezdőknek",
      excerpt: "Tippek, trükkök, eszközök és növények kezdőknek.",
      author: "Anna",
      replies: 5,
      lastActive: "Ma 09:30",
      isPinned: true,
    },
    {
      id: 102,
      categoryId: "dev",
      title: "React + Tailwind UI ötletek",
      excerpt: "Oszd meg a kedvenc komponenseidet és layoutjaidat.",
      author: "Bence",
      replies: 3,
      lastActive: "Ma 10:05",
      isPinned: false,
    },
    {
      id: 103,
      categoryId: "gaming",
      title: "Kedvenc farming játékok",
      excerpt: "Stardew, Farm Sim, vagy valami más?",
      author: "Te",
      replies: 7,
      lastActive: "Tegnap 18:42",
      isPinned: false,
    },
  ]);

  const [posts, setPosts] = useState([
    {
      id: 201,
      threadId: 101,
      author: "Anna",
      text: "Én először mindig a talajt készítem elő, aztán jöhetnek a palánták.",
      timestamp: "09:31",
      isModerator: false,
      likes: 2,
      likedByMe: false,
    },
    {
      id: 202,
      threadId: 101,
      author: "Te",
      text: "Milyen ásót ajánlotok kiskerthez?",
      timestamp: "09:40",
      isModerator: true,
      likes: 5,
      likedByMe: true,
    },
    {
      id: 203,
      threadId: 102,
      author: "Bence",
      text: "Glassmorphism + zöld árnyalatok nagyon mennek most.",
      timestamp: "10:06",
      isModerator: true,
      likes: 1,
      likedByMe: false,
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");
  const [showNewTopicPopup, setShowNewTopicPopup] = useState(false);

  // Globális chat
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      user: "Anna",
      text: "Szia mindenkinek!",
      timestamp: "10:15",
      isModerator: false,
      fromSelf: false,
    },
    {
      id: 2,
      user: "Bence",
      text: "Helló! Hogy megy a kertészkedés?",
      timestamp: "10:16",
      isModerator: true,
      fromSelf: false,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Privát üzenetek (DM)
  const [dmSearch, setDmSearch] = useState("");
  const [dmConversations, setDmConversations] = useState([
    { id: 1, user: "Anna", lastMessage: "Szia!", avatarUrl: "", unread: 1 },
    { id: 2, user: "Bence", lastMessage: "Írtam valamit...", avatarUrl: "", unread: 0 },
  ]);
  const [activeDmId, setActiveDmId] = useState(null);
  const [dmMessages, setDmMessages] = useState({
    1: [
      {
        id: 1,
        fromSelf: false,
        user: "Anna",
        text: "Szia! Mi újság a kertben?",
        timestamp: "09:10",
      },
    ],
    2: [],
  });
  const [dmInput, setDmInput] = useState("");

  // Értesítések
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "thread_reply",
      title: "Új válasz érkezett",
      message: "Valaki válaszolt a 'Kertészkedés kezdőknek' témában.",
      createdAt: "Ma 10:20",
      read: false,
    },
    {
      id: 2,
      type: "dm",
      title: "Új privát üzenet",
      message: "Bence írt neked egy privát üzenetet.",
      createdAt: "Ma 09:50",
      read: true,
    },
  ]);

  const [password, setPassword] = useState("");

  //------------------------------------------------------
  // SEGÉDFÜGGVÉNYEK
  //------------------------------------------------------
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const unreadDmCount = dmConversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  function markNotificationRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function getAvatarForName(name) {
    if (name === currentUser.name && currentUser.avatarUrl) {
      return (
        <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
      );
    }
    return <span className="text-[10px]">{name.charAt(0).toUpperCase()}</span>;
  }

  function renderUserHoverCard(name, isModerator) {
    return (
      <div className="absolute left-9 top-0 hidden group-hover:flex flex-col bg-black/70 backdrop-blur-xl border border-white/20 p-3 rounded-xl w-44 z-50 shadow-xl">
        <p className="font-semibold text-white">{name}</p>
        <p className="text-xs text-lime-300">{isModerator ? "Moderátor" : "Felhasználó"}</p>
        <p className="text-xs text-white/60 mt-1">Csatlakozott: {currentUser.joinedAt}</p>
      </div>
    );
  }

  //------------------------------------------------------
  // FÓRUM LOGIKA
  //------------------------------------------------------
  const activeThread =
    activeThreadId != null ? threads.find((t) => t.id === activeThreadId) || null : null;

  const visibleThreads = threads
    .slice()
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1))
    .filter((t) => (selectedCategory === "all" ? true : t.categoryId === selectedCategory));

  function handleAddReply() {
    if (!newReply.trim() || !activeThread) return;
    const now = new Date();
    const time = now.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    const newPost = {
      id: Date.now(),
      threadId: activeThread.id,
      author: currentUser.name,
      text: newReply,
      timestamp: time,
      isModerator: currentUser.isModerator,
      likes: 0,
      likedByMe: false,
    };
    setPosts((prev) => [...prev, newPost]);
    setNewReply("");
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              replies: t.replies + 1,
              lastActive: "Ma " + time,
            }
          : t
      )
    );
  }

  function handleAddTopic() {
    if (!newTopicTitle.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    const categoryId = selectedCategory === "all" ? categories[0].id : selectedCategory;
    const newThreadId = Date.now();
    const newThread = {
      id: newThreadId,
      categoryId,
      title: newTopicTitle,
      excerpt: newTopicBody || "Új téma a fórumban.",
      author: currentUser.name,
      replies: newTopicBody.trim() ? 1 : 0,
      lastActive: "Ma " + time,
      isPinned: false,
    };
    setThreads((prev) => [...prev, newThread]);

    if (newTopicBody.trim()) {
      const firstPost = {
        id: newThreadId + 1,
        threadId: newThreadId,
        author: currentUser.name,
        text: newTopicBody,
        timestamp: time,
        isModerator: currentUser.isModerator,
        likes: 0,
        likedByMe: false,
      };
      setPosts((prev) => [...prev, firstPost]);
    }

    setNewTopicTitle("");
    setNewTopicBody("");
    setShowNewTopicPopup(false);
    setActiveThreadId(newThreadId);
  }

  function togglePostLike(postId) {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.likedByMe;
        return {
          ...p,
          likedByMe: liked,
          likes: p.likes + (liked ? 1 : -1),
        };
      })
    );
  }

  //------------------------------------------------------
  // GLOBÁLIS CHAT LOGIKA
  //------------------------------------------------------
  function sendGlobalMessage() {
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    const msg = {
      id: Date.now(),
      user: currentUser.name,
      text: chatInput,
      timestamp: time,
      isModerator: currentUser.isModerator,
      fromSelf: true,
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  }

  function deleteGlobalMessage(id) {
    if (!currentUser.isModerator) return;
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
  }

  //------------------------------------------------------
  // DM LOGIKA
  //------------------------------------------------------
  function markDmAsRead(id) {
    setDmConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function sendDmMessage() {
    if (!dmInput.trim() || activeDmId == null) return;
    const now = new Date();
    const time = now.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
    const msg = {
      id: Date.now(),
      fromSelf: true,
      user: currentUser.name,
      text: dmInput,
      timestamp: time,
    };
    setDmMessages((prev) => {
      const conv = prev[activeDmId] || [];
      return { ...prev, [activeDmId]: [...conv, msg] };
    });
    setDmInput("");

    setDmConversations((prev) =>
      prev.map((c) =>
        c.id === activeDmId
          ? {
              ...c,
              lastMessage: dmInput,
            }
          : c
      )
    );
  }

  //------------------------------------------------------
  // PAGE RENDEREK
  //------------------------------------------------------
  function renderHomePage() {
    return (
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
        {/* Kategóriák */}
        <div className="md:w-64 w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 flex flex-col gap-4 md:h-full max-h-64 md:max-h-none overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg md:text-xl font-semibold">Kategóriák</h2>
            <button
              className="w-8 h-8 rounded-full bg:white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl transition"
              onClick={() => setShowNewTopicPopup(true)}
            >
              +
            </button>
          </div>
          <Button
            variant="ghost"
            className={
              "justify-start text-white hover:bg-white/20 " +
              (selectedCategory === "all" ? "bg-white/20" : "")
            }
            onClick={() => setSelectedCategory("all")}
          >
            Összes
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant="ghost"
              className={
                "justify-start text-white hover:bg-white/20 " +
                (selectedCategory === cat.id ? "bg-white/20" : "")
              }
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Thread lista / thread nézet */}
        <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 overflow-y-auto">
          {!activeThread && (
            <>
              <h2 className="text-xl md:text-2xl font-bold mb-4">Legújabb témák</h2>
              <div className="flex flex-col gap-4">
                {visibleThreads.map((thread) => (
                  <Card
                    key={thread.id}
                    className="bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/20 transition"
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <h3 className="text-lg md:text-xl font-semibold mb-1">
                      {thread.title}
                    </h3>
                    <p className="text-white/80 text-sm md:text-base mb-2">
                      {thread.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-white/70">
                      <span>Szerző: {thread.author}</span>
                      <span>Válaszok: {thread.replies}</span>
                      <span>Utolsó aktivitás: {thread.lastActive}</span>
                      {thread.isPinned && <span className="text-lime-300">Kiemelt</span>}
                    </div>
                  </Card>
                ))}
                {visibleThreads.length === 0 && (
                  <p className="text-sm text-white/70">Nincs még téma ebben a kategóriában.</p>
                )}
              </div>
            </>
          )}

          {activeThread && (
            <div className="flex flex-col gap-4">
              <button
                className="text-xs md:text-sm text-white/70 hover:text-white mb-2"
                onClick={() => setActiveThreadId(null)}
              >
                ← Vissza a listához
              </button>

              <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
                <h2 className="text-xl md:text-2xl font-bold mb-1">{activeThread.title}</h2>
                <p className="text-white/80 text-sm md:text-base mb-2">
                  {activeThread.excerpt}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text:white/70">
                  <span>Szerző: {activeThread.author}</span>
                  <span>Válaszok: {activeThread.replies}</span>
                  <span>Utolsó aktivitás: {activeThread.lastActive}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1 md:pr-2">
                {posts
                  .filter((p) => p.threadId === activeThread.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="border-b border-white/20 pb-3 md:pb-4 text-sm md:text-base"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                            {getAvatarForName(p.author)}
                          </div>
                          <span className="font-semibold text-xs md:text-sm">
                            {p.author}
                          </span>
                          {p.isModerator && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/80 text-black">
                              MOD
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] md:text-[11px] text-white/70">
                          {p.timestamp}
                        </span>
                      </div>
                      <p className="mb-2 whitespace-pre-wrap">{p.text}</p>
                      <button
                        className={
                          "inline-flex items-center gap-1 text-[11px] md:text-xs px-2 py-1 rounded-full border " +
                          (p.likedByMe
                            ? "border-lime-400 bg-lime-500/20 text-lime-300"
                            : "border-white/30 text-white/80 hover:bg-white/10")
                        }
                        onClick={() => togglePostLike(p.id)}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{p.likes}</span>
                      </button>
                    </div>
                  ))}
              </div>

              {/* Rich text jellegű válasz */}
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2 text-xs text-white/70">
                  <span>Formázás:</span>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                    onClick={() => setNewReply(newReply + "**félkövér** ")}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                    onClick={() => setNewReply(newReply + "*dőlt* ")}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 rounded bg-white/10 hover:bg:white/20"
                    onClick={() => setNewReply(newReply + "`kód` ")}
                  >
                    &lt;/&gt;
                  </button>
                </div>
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Válasz írása... (markdown-szerű formázás használható)"
                  className="bg-white/20 text-white placeholder:text-white/60 rounded-xl p-3 text-sm md:text-base min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddReply();
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddReply}
                    className="bg-lime-500 hover:bg-lime-600 text-black"
                  >
                    Küldés
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderChatPage() {
    return (
      <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 flex flex-col">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Globális Chat</h2>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 md:pr-2">
          {chatMessages.map((msg) => {
            const isSelf = msg.fromSelf;
            return (
              <div
                key={msg.id}
                className={"flex w-full " + (isSelf ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "flex items-start gap-2 max-w-[80%] md:max-w-[70%] " +
                    (isSelf ? "flex-row-reverse" : "flex-row")
                  }
                >
                  <div className="relative group w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                    {getAvatarForName(msg.user)}
                    {renderUserHoverCard(msg.user, msg.isModerator)}
                  </div>
                  <div
                    className={
                      "rounded-2xl border p-3 md:p-4 text-sm md:text-base shadow-sm transition-all duration-200 " +
                      (isSelf
                        ? "bg-lime-400 text-black border-lime-300 rounded-br-sm"
                        : "bg-white/10 text-white border-white/20 rounded-bl-sm") +
                      " animate-in slide-in-from-bottom-2 fade-in-0"
                    }
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs md:text-sm">
                          {msg.user}
                        </span>
                        {msg.isModerator && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/80 text-black">
                            MOD
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] md:text-[11px] opacity-80">
                        {msg.timestamp}
                      </span>
                    </div>
                    <p>{msg.text}</p>
                    {currentUser.isModerator && (
                      <button
                        onClick={() => deleteGlobalMessage(msg.id)}
                        className="mt-2 text-[10px] md:text-xs uppercase tracking-wide opacity-70 hover:opacity-100"
                      >
                        Üzenet törlése
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-4">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Írj üzenetet..."
            className="bg-white/20 text-white placeholder:text-white/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendGlobalMessage();
              }
            }}
          />
          <Button
            onClick={sendGlobalMessage}
            className="bg-lime-500 hover:bg-lime-600 text-black"
          >
            Küldés
          </Button>
        </div>
      </div>
    );
  }

  function renderDmPage() {
    const filteredConversations = dmConversations.filter((c) =>
      c.user.toLowerCase().includes(dmSearch.toLowerCase())
    );
    const activeConv = activeDmId
      ? dmConversations.find((c) => c.id === activeDmId) || null
      : null;

    return (
      <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 flex gap-6">
        {/* LEFT: Conversation list */}
        <div className="w-64 bg-white/10 border border-white/20 rounded-2xl p-4 flex flex-col gap-3">
          <Input
            value={dmSearch}
            onChange={(e) => setDmSearch(e.target.value)}
            placeholder="Felhasználó keresése..."
            className="bg-white/20 text-white placeholder:text-white/60"
          />
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[55vh]">
            {filteredConversations.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveDmId(c.id);
                  markDmAsRead(c.id);
                }}
                className={
                  "relative flex items-center gap-3 p-2 rounded-xl text-left transition " +
                  (activeDmId === c.id ? "bg-white/20" : "hover:bg-white/10")
                }
              >
                <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.user} className="w-full h-full object-cover" />
                  ) : (
                    <span>{c.user.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {c.unread > 0 && (
                  <span className="w-3 h-3 rounded-full bg-red-500 absolute right-0 top-1/2 -translate-y-1/2 border border-black" />
                )}
                <div>
                  <p className="font-semibold text-sm">{c.user}</p>
                  <p className="text-xs opacity-70 truncate max-w-[120px]">
                    {c.lastMessage}
                  </p>
                </div>
              </button>
            ))}
            {filteredConversations.length === 0 && (
              <p className="text-xs text-white/70">Nincs találat.</p>
            )}
          </div>
        </div>

        {/* RIGHT: Chat window */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col">
          {!activeConv && (
            <p className="text-white/70 text-center mt-10 text-sm">
              Válassz egy beszélgetést, vagy keress rá egy felhasználóra.
            </p>
          )}

          {activeConv && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {activeConv.avatarUrl ? (
                    <img
                      src={activeConv.avatarUrl}
                      alt={activeConv.user}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{activeConv.user.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="text-xl font-semibold">{activeConv.user}</h3>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
                {(dmMessages[activeConv.id] || []).map((m) => (
                  <div
                    key={m.id}
                    className={
                      "flex w-full " + (m.fromSelf ? "justify-end" : "justify-start")
                    }
                  >
                    <div
                      className={
                        "max-w-[75%] rounded-2xl border p-2 md:p-3 text-sm md:text-base " +
                        (m.fromSelf
                          ? "bg-lime-400 text-black border-lime-300"
                          : "bg-white/10 text-white border-white/20")
                      }
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{m.user}</span>
                        <span className="text-[10px] opacity-80">{m.timestamp}</span>
                      </div>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
                {(dmMessages[activeConv.id] || []).length === 0 && (
                  <p className="opacity-70 text-sm">Nincsenek üzenetek (még)…</p>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Input
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  placeholder="Írj üzenetet..."
                  className="bg-white/20 text-white placeholder:text-white/60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendDmMessage();
                    }
                  }}
                />
                <Button
                  onClick={sendDmMessage}
                  className="bg-lime-500 hover:bg-lime-600 text-black"
                >
                  Küldés
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderNotificationsPage() {
    return (
      <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Értesítések</h2>
          {unreadNotificationCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs md:text-sm"
              onClick={markAllNotificationsRead}
            >
              Összes olvasottnak jelölése
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1 md:pr-2">
          {notifications.length === 0 && (
            <p className="text-sm text-white/70">Nincsenek értesítéseid.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markNotificationRead(n.id)}
              className={
                "w-full text-left bg-white/10 border rounded-2xl px-4 py-3 md:px-5 md:py-4 transition " +
                (n.read
                  ? "border-white/10 opacity-70"
                  : "border-lime-400 bg-lime-500/10")
              }
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 uppercase tracking-wide">
                    {n.type === "thread_reply"
                      ? "Válasz"
                      : n.type === "dm"
                      ? "Privát üzenet"
                      : n.type === "like"
                      ? "Like"
                      : "Rendszer"}
                  </span>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-lime-400" />
                  )}
                </div>
                <span className="text-[10px] md:text-[11px] text-white/70">
                  {n.createdAt}
                </span>
              </div>
              <p className="font-semibold text-sm md:text-base mb-0.5">{n.title}</p>
              <p className="text-xs md:text-sm text-white/80">{n.message}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderProfilePage() {
    return (
      <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 md:p-6 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3 flex flex-col items-center text-center gap-4">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-3xl md:text-4xl">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">{currentUser.name}</h2>
            <p className="text-lime-300 text-sm md:text-base">
              {currentUser.isModerator ? "Moderátor" : "Felhasználó"}
            </p>
            <p className="text-xs text-white/60 mt-1">Csatlakozott: {currentUser.joinedAt}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <Card className="bg-white/10 border-white/20 p-4 rounded-2xl">
            <h3 className="font-semibold mb-3">Profil adatok szerkesztése</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-sm">
                <label className="text-white/80">Felhasználónév</label>
                <Input
                  value={currentUser.name}
                  onChange={(e) =>
                    setCurrentUser({ ...currentUser, name: e.target.value })
                  }
                  className="bg-white/20 text-white placeholder:text-white/60"
                  placeholder="Felhasználónév"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="text-white/80">E-mail cím</label>
                <Input
                  type="email"
                  value={currentUser.email}
                  onChange={(e) =>
                    setCurrentUser({ ...currentUser, email: e.target.value })
                  }
                  className="bg-white/20 text-white placeholder:text-white/60"
                  placeholder="email@pelda.hu"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="text-white/80">Új jelszó</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/20 text-white placeholder:text-white/60"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="text-white/80">Avatar feltöltése</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024 * 2) {
                      alert("A fájl mérete maximum 2 MB lehet.");
                      return;
                    }
                    const safeURL = URL.createObjectURL(file);
                    setCurrentUser({ ...currentUser, avatarUrl: safeURL });
                  }}
                  className="bg-white/20 text-white p-2 rounded-md"
                />
              </div>
              <div className="flex justify-end mt-2">
                <Button className="bg-lime-500 hover:bg-lime-600 text-black text-sm px-4">
                  Mentés
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-white/10 border-white/20 p-4 rounded-2xl">
            <h3 className="font-semibold mb-2">Moderátori eszközök</h3>
            <ul className="list-disc list-inside text-sm md:text-base text-white/80 space-y-1">
              <li>Üzenetek törlése a globális chatben</li>
              <li>Témák zárolása / kiemelése (később backenddel)</li>
              <li>Felhasználók figyelmeztetése (később backenddel)</li>
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  //------------------------------------------------------
  // RENDER ROOT
  //------------------------------------------------------
  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        unreadNotifications={unreadNotificationCount}
        unreadDM={unreadDmCount}
      />

      <div className="flex-1 p-4 md:p-6 flex flex-col gap-6">
        <Topbar currentUser={currentUser} />

        {activePage === "home" && renderHomePage()}
        {activePage === "chat" && renderChatPage()}
        {activePage === "dm" && renderDmPage()}
        {activePage === "notifications" && renderNotificationsPage()}
        {activePage === "profile" && renderProfilePage()}
      </div>

      {/* Új téma popup */}
      {showNewTopicPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white/10 border border-white/20 backdrop-blur-xl p-6 rounded-2xl w-11/12 max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-white">Új téma hozzáadása</h3>
            <Input
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Téma címe..."
              className="mb-3 bg-white/20 text-white placeholder:text-white/60"
            />
            <Input
              value={newTopicBody}
              onChange={(e) => setNewTopicBody(e.target.value)}
              placeholder="Leírás..."
              className="mb-4 bg-white/20 text-white placeholder:text-white/60"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="text-white"
                onClick={() => setShowNewTopicPopup(false)}
              >
                Mégse
              </Button>
              <Button
                className="bg-lime-500 hover:bg-lime-600 text-black"
                onClick={handleAddTopic}
              >
                Hozzáadás
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}