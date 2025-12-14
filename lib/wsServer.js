import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET missing!");

// userId → socket
const clients = new Map();
const onlineUsers = new Set();

function parseAuthToken(token) {
  try {
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.id ? { id: payload.id } : null;
  } catch {
    return null;
  }
}

export function createWSServer(server) {
  const wss = new WebSocketServer({ noServer: true });
  globalThis.__WSS__ = wss;

  wss.on("connection", async (socket, req) => {
    // ---------------- AUTH ----------------
    const cookie = req.headers.cookie || "";
    const token = cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith("token="))
      ?.substring("token=".length);

    const user = parseAuthToken(token);
    if (!user) {
      socket.close();
      return;
    }

    const userId = user.id;
    clients.set(userId, socket);
    onlineUsers.add(userId);

    // egész snapshot mindenkinek
    broadcastAll({
      type: "presence_snapshot",
      users: Array.from(onlineUsers),
    });

    // a belépő is kap snapshotot
    socket.send(
      JSON.stringify({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      })
    );

    // külön presence update
    broadcastExcept(userId, {
      type: "presence_update",
      userId,
      status: "online",
    });

    // ------------- MESSAGE HANDLER -------------
    socket.on("message", async (raw) => {
      if (raw instanceof Buffer) return;

      let parsed;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }

      // --------------------------------------------------------------------
      // 🌍 GLOBAL MESSAGE
      // --------------------------------------------------------------------
      if (parsed.type === "global_message") {
        const text = (parsed.text || "").trim();
        if (!text) return;

        const saved = await prisma.chatMessage.create({
          data: { text, authorId: userId },
          include: {
            author: true,
            reactions: {
              include: {
                users: true,
              },
            },
          },
        });

        broadcastAll({
          type: "global_message",
          message: formatGlobalMessage(saved),
        });

        return;
      }

      // --------------------------------------------------------------------
      // ✏️ GLOBAL EDIT – javított verzió
      // --------------------------------------------------------------------
      if (parsed.type === "chat_edit") {
        const messageId = parsed.id;
        const text = (parsed.text || "").trim();
        if (!messageId || !text) return;

        const original = await prisma.chatMessage.findUnique({
          where: { id: messageId },
        });
        if (!original) return;

        // jogosultság
        if (original.authorId !== userId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          });
          if (dbUser.role === "USER") return;
        }

        const updated = await prisma.chatMessage.update({
          where: { id: messageId },
          data: { text, edited: true },
          include: {
            author: true,
            reactions: {
              include: {
                users: true,
              },
            },
          },
        });

        broadcastAll({
          type: "chat_edit",
          message: formatGlobalMessage(updated), // <<< FIXED
        });

        return;
      }

      // --------------------------------------------------------------------
      // 😀 REACTION – szerveren tökéletesen formázott output
      // --------------------------------------------------------------------
      if (parsed.type === "reaction") {
        const { messageId, emoji } = parsed;
        if (!messageId || !emoji) return;

        const existing = await prisma.reaction.findFirst({
          where: { messageId, emoji },
        });

        let reactionRecord;

        // ha nincs ilyen emoji reakció még
        if (!existing) {
          reactionRecord = await prisma.reaction.create({
            data: {
              emoji,
              messageId,
              users: {
                connect: { id: userId },
              },
            },
            include: { users: true },
          });
        } else {
          const already = await prisma.reaction.findFirst({
            where: {
              id: existing.id,
              users: { some: { id: userId } },
            },
          });

          if (already) {
            reactionRecord = await prisma.reaction.update({
              where: { id: existing.id },
              data: {
                users: { disconnect: { id: userId } },
              },
              include: { users: true },
            });
          } else {
            reactionRecord = await prisma.reaction.update({
              where: { id: existing.id },
              data: {
                users: { connect: { id: userId } },
              },
              include: { users: true },
            });
          }
        }

        const allReactions = await prisma.reaction.findMany({
          where: { messageId },
          include: { users: true },
        });

        const formatted = allReactions.map((r) => ({
          emoji: r.emoji,
          count: r.users.length,
          mine: r.users.some((u) => u.id === userId),
          users: r.users.map((u) => u.username),
        }));

        broadcastAll({
          type: "chat_reaction",
          messageId,
          reactions: formatted,
        });

        return;
      }

      // --------------------------------------------------------------------
      // DM MESSAGE
      // --------------------------------------------------------------------
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
          include: { from: true, to: true },
        });

        const payload = {
          type: "dm_message",
          message: formatDMMessage(saved),
        };

        const sockTo = clients.get(toId);
        if (sockTo?.readyState === sockTo.OPEN) {
          sockTo.send(JSON.stringify(payload));
        }

        socket.send(JSON.stringify(payload));
        return;
      }

      // --------------------------------------------------------------------
      // DM TYPING
      // --------------------------------------------------------------------
      if (parsed.type === "dm_typing") {
        const toId = parsed.toId;
        if (!toId) return;

        const sockTo = clients.get(toId);
        if (!sockTo || sockTo.readyState !== sockTo.OPEN) return;

        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        sockTo.send(
          JSON.stringify({
            type: "dm_typing",
            fromId: userId,
            username: dbUser.username,
          })
        );
        return;
      }

      // --------------------------------------------------------------------
      // GLOBAL TYPING
      // --------------------------------------------------------------------
      if (parsed.type === "typing" && parsed.chat === "global") {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });

        broadcastExcept(userId, {
          type: "typing",
          chat: "global",
          userId,
          username: dbUser.username,
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
  });

  return wss;
}

// -----------------------------------------------------------------------------------
// HELPER: Format Global Chat Message
// -----------------------------------------------------------------------------------
function formatGlobalMessage(m) {
  return {
    id: m.id,
    text: m.text,
    edited: m.edited,
    createdAt: m.createdAt,
    authorId: m.authorId,
    author: {
      id: m.author.id,
      username: m.author.username,
      avatarUrl: m.author.avatarUrl,
      role: m.author.role,
    },
    reactions:
      m.reactions?.map((r) => ({
        emoji: r.emoji,
        count: r.users.length,
        mine: false,
        users: r.users.map((u) => u.username),
      })) ?? [],
  };
}

// -----------------------------------------------------------------------------------
// HELPER: Format DM Message
// -----------------------------------------------------------------------------------
function formatDMMessage(m) {
  return {
    id: m.id,
    text: m.text,
    fromId: m.fromId,
    toId: m.toId,
    createdAt: m.createdAt,
    read: m.read,

    from: {
      id: m.from.id,
      username: m.from.username,
      avatarUrl: m.from.avatarUrl,
    },

    to: {
      id: m.to.id,
      username: m.to.username,
      avatarUrl: m.to.avatarUrl,
    },
  };
}

// -----------------------------------------------------------------------------------
function broadcastAll(obj) {
  const wss = globalThis.__WSS__;
  if (!wss) return;

  const payload = JSON.stringify(obj);

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
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

export function wssBroadcast(obj) {
  broadcastAll(obj);
}
