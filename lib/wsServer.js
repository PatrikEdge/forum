const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ---------------------- Clients & Presence ----------------------
const clients = new Map();    // userId -> socket
const onlineUsers = new Set();

// ---------------------- Token Parse ----------------------------
function parseAuthToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) return null;
    return { id: payload.id };
  } catch {
    return null;
  }
}

// ======================== WEBSOCKET SERVER ========================
function createWSServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (socket, req) => {
    // -------- Authenticate --------
    try {
      const cookieHeader = req.headers.cookie || "";
      const token = cookieHeader.split("token=")[1]?.split(";")[0];
      if (!token) return socket.close();

      const user = parseAuthToken(token);
      if (!user) return socket.close();

      const userId = user.id;
      clients.set(userId, socket);
      onlineUsers.add(userId);

      // -------- Send Presence Snapshot --------
      socket.send(JSON.stringify({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      }));

      // -------- Broadcast presence update --------
      broadcastExcept(userId, {
        type: "presence_update",
        userId,
        status: "online",
      });

      // ==========================================================
      // ======================== WS HANDLER =======================
      // ==========================================================
      socket.on("message", async raw => {
        try {
          if (raw instanceof Buffer) return;
          const parsed = JSON.parse(raw.toString());

          // -------------------- SEND GLOBAL MESSAGE --------------------
          if (parsed.type === "global_message") {
            const text = (parsed.text || "").trim();
            if (!text) return;

            const saved = await prisma.chatMessage.create({
              data: { text, authorId: userId },
              include: { author: true },
            });

            broadcastAll({
              type: "global_message",
              message: formatMessage(saved)
            });
            return;
          }

          // -------------------- EDIT MESSAGE --------------------
          if (parsed.type === "chat_edit") {
            const { id, text } = parsed;
            if (!id || !text) return;

            const msg = await prisma.chatMessage.findUnique({ where: { id } });
            if (!msg || msg.authorId !== userId) return;

            const updated = await prisma.chatMessage.update({
              where: { id },
              data: { text, edited: true },
              include: { author: true, reactions: true },
            });

            broadcastAll({
              type: "chat_edit",
              message: formatMessage(updated)
            });
            return;
          }

          // -------------------- REACTION TOGGLE --------------------
          if (parsed.type === "chat_reaction") {
            const { messageId, emoji } = parsed;
            if (!messageId || !emoji) return;

            const existing = await prisma.chatReaction.findFirst({
              where: { messageId, userId, emoji }
            });

            if (existing) {
              await prisma.chatReaction.delete({ where: { id: existing.id } });
            } else {
              await prisma.chatReaction.create({
                data: { messageId, userId, emoji },
              });
            }

            const updatedReactions = await prisma.chatReaction.findMany({
              where: { messageId },
              select: { emoji: true },
            });

            // Convert to { emoji, count }
            const reactionCounts = Object.values(updatedReactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {}))
            const formatted = Object.entries(updatedReactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {})).map(([emoji, count]) => ({ emoji, count }));

            broadcastAll({
              type: "chat_reaction",
              messageId,
              reactions: formatted
            });
            return;
          }

          // -------------------- TYPING --------------------
          if (parsed.type === "typing" && parsed.chat === "global") {
            const userData = await prisma.user.findUnique({
              where: { id: userId },
              select: { username: true },
            });

            broadcastExcept(userId, {
              type: "typing",
              chat: "global",
              userId,
              username: userData?.username ?? "?"
            });
            return;
          }

        } catch (err) {
          console.error("WS chat error:", err);
        }
      });

      // -------------------- ON CLOSE --------------------
      socket.on("close", () => {
        clients.delete(userId);
        onlineUsers.delete(userId);

        broadcastAll({
          type: "presence_update",
          userId,
          status: "offline",
        });
      });

    } catch (err) {
      console.error("WS error:", err);
      socket.close();
    }
  });

  return wss;
}

// ====================== HELPERS ======================

function broadcastAll(obj) {
  const payload = JSON.stringify(obj);
  for (const s of clients.values()) {
    if (s.readyState === s.OPEN) s.send(payload);
  }
}

function broadcastExcept(userId, obj) {
  const payload = JSON.stringify(obj);
  for (const [id, s] of clients) {
    if (id !== userId && s.readyState === s.OPEN) s.send(payload);
  }
}

function formatMessage(m) {
  return {
    id: m.id,
    text: m.text,
    edited: m.edited,
    createdAt: m.createdAt,
    reactions: m.reactions?.map(r => ({ emoji: r.emoji })) ?? [],
    authorId: m.authorId,
    author: {
      id: m.author.id,
      username: m.author.username,
      avatarUrl: m.author.avatarUrl,
      role: m.author.role,
    }
  };
}

module.exports = { createWSServer };