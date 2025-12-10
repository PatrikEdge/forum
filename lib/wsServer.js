import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is missing!");

// userId -> socket
const clients = new Map();
const onlineUsers = new Set();

function parseAuthToken(token) {
  try {
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return null;
    return { id: payload.id };
  } catch {
    return null;
  }
}

export function createWSServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  globalThis.__WSS__ = wss;

  wss.on("connection", async (socket, req) => {
    try {
      // ---- Auth cookie -> token ----
      const cookie = req.headers.cookie || "";
      const token = cookie
        .split(";")
        .map(v => v.trim())
        .find(v => v.startsWith("token="))
        ?.substring("token=".length);

      const user = parseAuthToken(token);
      if (!user) {
        socket.close();
        return;
      }

      const userId = user.id;
      clients.set(userId, socket);
      onlineUsers.add(userId);

      // teljes snapshot mindenki felé
      broadcastAll({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      });

      // csak a belépőnek is küldünk snapshotot
      socket.send(
        JSON.stringify({
          type: "presence_snapshot",
          users: Array.from(onlineUsers),
        })
      );

      // külön presence update a többieknek
      broadcastExcept(userId, {
        type: "presence_update",
        userId,
        status: "online",
      });

      // ------------- ON MESSAGE -------------
      socket.on("message", async raw => {
        if (raw instanceof Buffer) return;
        let parsed;
        try {
          parsed = JSON.parse(raw.toString());
        } catch {
          return;
        }

        // 🌍 GLOBAL CHAT MESSAGE
        if (parsed.type === "global_message") {
          const text = (parsed.text || "").trim();
          if (!text) return;

          const saved = await prisma.chatMessage.create({
            data: { text, authorId: userId },
            include: { author: true, reactions: true },
          });

          broadcastAll({
            type: "global_message",
            message: formatGlobalMessage(saved),
          });
          return;
        }

        // ✏️ GLOBAL CHAT EDIT (csak broadcast, mentés REST-ben van)
        if (parsed.type === "chat_edit") {
          const text = (parsed.text || "").trim();
          const messageId = parsed.id;
          if (!text || !messageId) return;

          const original = await prisma.chatMessage.findUnique({
            where: { id: messageId },
          });
          if (!original) return;

          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          });

          if (original.authorId !== userId && dbUser?.role === "USER") {
            return;
          }

          broadcastAll({
            type: "chat_edit",
            id: messageId,
            text,
          });
          return;
        }

        // 💬 DM ÜZENET
        if (parsed.type === "dm_message") {
          const text = (parsed.text || "").trim();
          const toId = parsed.toId;
          if (!text || !toId) return;

          const saved = await prisma.dMMessage.create({
            data: {
              text,
              fromId: userId,
              toId,
            },
            include: {
              from: true,
              to: true,
            },
          });

          const messagePayload = formatDMMessage(saved);

          // címzettnek, ha online
          const socketTo = clients.get(toId);
          if (socketTo && socketTo.readyState === socketTo.OPEN) {
            socketTo.send(
              JSON.stringify({
                type: "dm_message",
                message: messagePayload,
              })
            );
          }

          // echo a küldőnek is
          socket.send(
            JSON.stringify({
              type: "dm_message",
              message: messagePayload,
            })
          );

          return;
        }

        // 💬 DM TYPING
        if (parsed.type === "dm_typing") {
          const toId = parsed.toId;
          if (!toId) return;

          const socketTo = clients.get(toId);
          if (!socketTo || socketTo.readyState !== socketTo.OPEN) return;

          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true },
          });

          socketTo.send(
            JSON.stringify({
              type: "dm_typing",
              fromId: userId,
              username: dbUser?.username ?? "?",
            })
          );
          return;
        }

        // 💬 GLOBAL TYPING
        if (parsed.type === "typing" && parsed.chat === "global") {
          const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true },
          });

          broadcastExcept(userId, {
            type: "typing",
            chat: "global",
            userId,
            username: userData?.username ?? "?",
          });
          return;
        }
      });

      // ------------- ON CLOSE -------------
      socket.on("close", () => {
        clients.delete(userId);
        onlineUsers.delete(userId);

        broadcastAll({
          type: "presence_update",
          userId,
          status: "offline",
        });

        broadcastAll({
          type: "presence_snapshot",
          users: Array.from(onlineUsers),
        });
      });
    } catch (err) {
      console.error("WS error:", err);
      socket.close();
    }
  });

  return wss;
}

// ---------- broadcast helper ----------
function broadcastAll(obj) {
  const wss = globalThis.__WSS__;
  if (!wss) return;
  const payload = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function broadcastExcept(userId, obj) {
  const payload = JSON.stringify(obj);
  for (const [id, socket] of clients.entries()) {
    if (id !== userId && socket.readyState === socket.OPEN) {
      socket.send(payload);
    }
  }
}

// Chat üzenet formázása
function formatGlobalMessage(m) {
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
    },
  };
}

// DM üzenet formázása
function formatDMMessage(m) {
  return {
    id: m.id,
    text: m.text,
    fromId: m.fromId,
    toId: m.toId,
    createdAt: m.createdAt,
    read: m.read,
    fromUser: {
      id: m.from.id,
      username: m.from.username,
      avatarUrl: m.from.avatarUrl,
    },
    toUser: {
      id: m.to.id,
      username: m.to.username,
      avatarUrl: m.to.avatarUrl,
    },
  };
}

// ezt használjuk API route-okból is
export function wssBroadcast(obj) {
  const wss = globalThis.__WSS__;
  if (!wss) return;
  const payload = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}