"use client";

import { useEffect, useState } from "react";
import { Home, User, MessageCircle, Bell, Mail, Search, ThumbsUp, Send, X, Pin, Trash2 } from "lucide-react";

// Mock user provider (replace with your actual provider)
const useUser = () => {
  const [user, setUser] = useState({
    id: "user1",
    username: "TestUser",
    email: "test@example.com",
    role: "USER",
    avatarUrl: null
  });
  
  return {
    user,
    loading: false,
    refreshUser: async () => {
      // Refresh user data from API
      const res = await fetch("/api/user/me");
      if (res.ok) {
        setUser(await res.json());
      }
    }
  };
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
              <span className="text-sm font-semibold">{user.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="text-xs md:text-sm text-right hidden md:block">
            <p className="font-semibold">{user.username}</p>
            <p className="text-lime-300 text-[11px] md:text-xs">
              {user.role === "MODERATOR" ? "Moderátor" : user.role === "ADMIN" ? "Admin" : "Felhasználó"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------- Main Page -------------------------
export default function ForumUI() {
  const { user, loading, refreshUser } = useUser();

  const [activePage, setActivePage] = useState("home");

  // Forum state
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

  // UI state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newReply, setNewReply] = useState("");
  const [showNewTopicPopup, setShowNewTopicPopup] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");

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
      const res = await fetch(`/api/thread/${id}`);
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

  const sendMessage = async () => {
    if (!dmText || !activeDM) return;
    const text = dmText;
    setDMText("");

    try {
      await fetch("/api/dm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: activeDM, text }),
      });
      loadConversation(activeDM);
      loadDMUsers();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Global Chat functions
  const loadChatMessages = async () => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat/messages");
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
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      loadChatMessages();
    } catch (err) {
      console.error("Failed to send chat message:", err);
      setChatText(text); // Restore text on error
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

  // Notifications functions
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

  // Load unread counts
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

  // User search
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

  // Initial load
  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || "");
      setProfileEmail(user.email || "");
      loadUnreadCounts();
      
      // Poll for unread counts every 30 seconds
      const interval = setInterval(loadUnreadCounts, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (activePage === "dm") {
      loadDMUsers();
    } else if (activePage === "chat") {
      loadChatMessages();
      // Poll for new messages every 5 seconds
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
    if (activeThread) loadThread(activeThread.id);
  }, [activeThread?.id]);

  // ------------------------- Actions -------------------------
  const handleAddReply = async () => {
    if (!newReply.trim()) return;
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThread.id, text: newReply }),
      });
      setNewReply("");
      loadThread(activeThread.id);
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopicTitle.trim() || !selectedCategory) return;
    try {
      await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTopicTitle,
          excerpt: newTopicBody,
          categoryId: selectedCategory !== "all" ? selectedCategory : categories[0]?.id,
        }),
      });
      setShowNewTopicPopup(false);
      setNewTopicBody("");
      setNewTopicTitle("");
      loadThreads();
    } catch (err) {
      console.error("Failed to add topic:", err);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      loadThread(activeThread.id);
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("A fájl mérete maximum 2 MB lehet.");
      return;
    }

    setProfileError(null);
    setProfileSuccess(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Nem sikerült frissíteni az avatart.");
      }

      setProfileSuccess("Avatar sikeresen frissítve.");
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setProfileError(err.message || "Nem sikerült frissíteni az avatart.");
    }
  };

  if (loading) return <div className="p-10 text-white">Betöltés...</div>;
  if (!user) return <div className="p-10 text-white">Jelentkezz be a fórumhoz!</div>;

  // ------------------------- Render -------------------------
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
                className={`justify-start text-white hover:bg-white/20 px-4 py-2 rounded-lg transition ${selectedCategory === "all" ? "bg-white/20" : ""}`}
                onClick={() => setSelectedCategory("all")}
              >
                Összes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`justify-start text-white hover:bg-white/20 px-4 py-2 rounded-lg transition ${selectedCategory === cat.id ? "bg-white/20" : ""}`}
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
                            <h3 className="text-lg md:text-xl font-semibold mb-1">{thread.title}</h3>
                            <p className="text-white/80 text-sm md:text-base mb-2">{thread.excerpt}</p>
                            <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-white/70">
                              <span>Szerző: {thread.author.username}</span>
                              {thread.isPinned && <span className="text-lime-300 flex items-center gap-1"><Pin className="w-3 h-3" /> Kiemelt</span>}
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
                    <p className="text-white/80 text-sm md:text-base mb-2">{activeThread.excerpt}</p>
                    <div className="flex flex-wrap gap-3 text-[11px] md:text-xs text-white/70">
                      <span>Szerző: {activeThread.author.username}</span>
                      {activeThread.isPinned && <span className="text-lime-300 flex items-center gap-1"><Pin className="w-3 h-3" /> Kiemelt</span>}
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
                                <span className="text-[10px]">{p.author.username.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="font-semibold text-xs md:text-sm">{p.author.username}</span>
                            {p.author.role === "MODERATOR" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/80 text-black">MOD</span>
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

        {/* ------- Global Chat ------- */}
        {activePage === "chat" && (
          <div className="flex flex-col h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="border-b border-white/20 p-4">
              <h2 className="text-xl font-bold">Globális Chat</h2>
              <p className="text-sm text-white/70">Beszélgess a közösséggel valós időben</p>
            </div>

            {chatLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/70">Betöltés...</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-start gap-3 p-2 hover:bg-white/5 rounded-lg group"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
                        {msg.author.avatarUrl ? (
                          <img src={msg.author.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs">{msg.author.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{msg.author.username}</span>
                          {msg.author.role === "MODERATOR" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime-500/80 text-black">MOD</span>
                          )}
                          <span className="text-[11px] text-white/50">
                            {new Date(msg.createdAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      {(user.role === "MODERATOR" || user.role === "ADMIN" || msg.authorId === user.id) && (
                        <button
                          onClick={() => deleteChatMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition"
                          title="Törlés"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-white/70">
                      <p>Még nincsenek üzenetek. Kezdd el a beszélgetést!</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/20 p-4 flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendChatMessage())}
                    placeholder="Írj üzenetet..."
                    className="flex-1 bg-white/20 text-white placeholder:text-white/60 rounded-lg px-4 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatText.trim()}
                    className="bg-lime-500 hover:bg-lime-600 disabled:bg-white/20 disabled:text-white/40 text-black px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Küldés
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ------- DM Page ------- */}
        {activePage === "dm" && (
          <div className="flex w-full h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="w-1/3 border-r border-white/20 p-4 flex flex-col gap-3 overflow-y-auto">
              <h2 className="text-lg font-bold mb-2">Privát üzenetek</h2>

              {dmLoading && <p className="text-white/60 text-sm">Betöltés...</p>}

              {!dmLoading && dmUsers.length === 0 && (
                <p className="text-white/60 text-sm">Nincs beszélgetésed.</p>
              )}

              {dmUsers.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => loadConversation(u.userId)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition ${
                    activeDM === u.userId ? "bg-white/20" : "hover:bg-white/10"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{u.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex flex-col text-left flex-1 min-w-0">
                    <span className="text-sm font-semibold">{u.username}</span>
                    <span className="text-xs text-white/60 truncate">
                      {u.lastMessage}
                    </span>
                  </div>
                </button>
              ))}

              <input
                value={searchDMText}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Felhasználó keresése..."
                className="bg-white/20 text-white placeholder:text-white/60 text-sm px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
              />

              {searchUsers.length > 0 && (
                <div className="flex flex-col border-t border-white/20 pt-2 mt-2">
                  {searchUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSearchDMText("");
                        setSearchUsers([]);
                        loadConversation(u.id);
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span>{u.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-sm">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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

                  <div className="border-t border-white/20 p-3 flex gap-2">
                    <input
                      value={dmText}
                      onChange={(e) => setDMText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Írj üzenetet..."
                      className="flex-1 bg-white/20 text-white placeholder:text-white/60 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-lime-500 hover:bg-lime-600 text-black px-4 py-2 rounded-lg font-semibold transition"
                    >
                      Küldés
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
                  {notifications.filter(n => !n.isRead).length} olvasatlan értesítés
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
                              {new Date(notif.createdAt).toLocaleString('hu-HU')}
                            </span>
                          </div>
                          {!notif.isRead && (
                            <div className="w-2 h-2 rounded-full bg-lime-400"></div>
                          )}
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
        {activePage === "profile" && (
          <div className="flex flex-col md:flex-row gap-6 h-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div className="w-full md:w-1/3 flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 overflow-hidden flex items-center justify-center text-3xl md:text-4xl">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold">{user.username}</p>
                <p className="text-lime-300 text-sm md:text-base">
                  {user.role === "MODERATOR" ? "Moderátor" : user.role === "ADMIN" ? "Admin" : "Felhasználó"}
                </p>
              </div>
            </div>

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

                  <div>
                    <label className="text-white/80 text-sm">Avatar feltöltése</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="w-full bg-white/20 text-white p-2 rounded-lg text-xs border border-white/20"
                    />
                    <p className="text-[11px] text-white/60 mt-1">Max 2MB</p>
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
      </div>

      {/* Modal: New Topic */}
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
    </div>
  );
}