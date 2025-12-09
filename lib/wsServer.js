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

  globalThis.__WSS__ = wss;

  wss.on("connection", async (socket, req) => {
    try {
      console.log("WS COOKIE:", req.headers.cookie);
      console.log("WS JWT_SECRET:", process.env.JWT_SECRET);

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
      console.log("ONLINE USERS SERVER:", Array.from(onlineUsers));

      // 🔥 TELJES FRISS ONLINE LISTA MINDENKINEK (belépés)
      broadcastAll({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      });

      // 📨 A belépő külön is kap snapshotot
      socket.send(JSON.stringify({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      }));

      // 🟢 Csak infó jelzés a többieknek
      broadcastExcept(userId, {
        type: "presence_update",
        userId,
        status: "online",
      });

      // ------------------------- ON MESSAGE -------------------------
      socket.on("message", async raw => {
        if (raw instanceof Buffer) return;
        try {
          const parsed = JSON.parse(raw.toString());

          // >>> CHAT MESSAGE SEND (globális)
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

          // >>> GLOBAL CHAT MESSAGE EDIT (ONLY BROADCAST)
          if (parsed.type === "chat_edit") {
            const text = (parsed.text || "").trim();
            const messageId = parsed.id;
            if (!text || !messageId) return;

            const original = await prisma.chatMessage.findUnique({ where: { id: messageId } });
            if (!original) return;

            const userData = await prisma.user.findUnique({
              where: { id: userId },
              select: { role: true },
            });

            if (original.authorId !== userId && userData?.role === "USER") {
              return;
            }

            broadcastAll({
              type: "chat_edit",
              id: messageId,
              text,
            });
            return;
          }

          // >>> DIRECT MESSAGE (DM) WEBSOCKETEN
          if (parsed.type === "dm_message") {
            const text = (parsed.text || "").trim();
            const toId = parsed.toId;
            if (!text || !toId) return;

            // 1) Mentés adatbázisba
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

            const messagePayload = {
              id: saved.id,
              text: saved.text,
              fromId: saved.fromId,
              toId: saved.toId,
              createdAt: saved.createdAt,
              read: saved.read,
              fromUser: {
                id: saved.from.id,
                username: saved.from.username,
                avatarUrl: saved.from.avatarUrl,
              },
              toUser: {
                id: saved.to.id,
                username: saved.to.username,
                avatarUrl: saved.to.avatarUrl,
              },
            };

            // 2) Címzettnek, ha online
            const socketTo = clients.get(toId);
            if (socketTo && socketTo.readyState === socketTo.OPEN) {
              socketTo.send(JSON.stringify({
                type: "dm_message",
                message: messagePayload,
              }));
            }

            // 3) Echo a küldőnek is (hogy azonnal lássa)
            socket.send(JSON.stringify({
              type: "dm_message",
              message: messagePayload,
            }));

            return;
          }

          // >>> TYPING INDICATOR (globális chat)
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

      // --------------------------- ON CLOSE ----------------------------
      socket.on("close", () => {
        clients.delete(userId);
        onlineUsers.delete(userId);
        console.log("ONLINE USERS SERVER (after close):", Array.from(onlineUsers));

        // ❗ Értesítés
        broadcastAll({
          type: "presence_update",
          userId,
          status: "offline",
        });

        // 🔥 TELJES LISTA FRISSÍTÉSE MINDENKINEK (kilépésnél is)
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