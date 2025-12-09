import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is missing!");

// ---------------------- Clients & Presence ----------------------
const clients = new Map();   // userId -> socket
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
    try {
      console.log("WS COOKIE:", req.headers.cookie);
      console.log("WS JWT_SECRET:", process.env.JWT_SECRET);

      const cookie = req.headers.cookie || "";
      const token = (() => {
  const raw = (req.headers.cookie || "")
    .split(";")
    .map(v => v.trim())
    .find(v => v.startsWith("token="));
  return raw ? raw.substring("token=".length) : null;
})();
console.log("WS PARSED TOKEN:", token);

      const user = token ? parseAuthToken(token) : null;
      if (!user) {
        console.warn("WS refused: Invalid token (cookie)");
        return socket.close();
      }

      const userId = user.id;
      clients.set(userId, socket);
      onlineUsers.add(userId);

      socket.send(JSON.stringify({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      }));

      broadcastExcept(userId, {
        type: "presence_update",
        userId,
        status: "online",
      });

      socket.on("message", async raw => {
        if (raw instanceof Buffer) return;
        try {
          const parsed = JSON.parse(raw.toString());

          // >>> CHAT MESSAGE SEND
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

          // >>> TYPING INDICATOR
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

export { createWSServer };