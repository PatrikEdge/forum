const { WebSocketServer } = require("ws");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ---- Token parsing ----
function parseAuthToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || !payload.id) return null;
    return { id: payload.id };
  } catch (e) {
    return null;
  }
}

// ---- Active WebSocket clients ----
const clients = new Map();

// ---- Online status tracking ----
const onlineUsers = new Set();

function createWSServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (socket, req) => {
    try {
      const cookieHeader = req.headers.cookie || "";
      const token = cookieHeader.split("token=")[1]?.split(";")[0];

      if (!token) return socket.close();
      const user = parseAuthToken(token);
      if (!user) return socket.close();

      const userId = user.id;
      clients.set(userId, socket);

      // ---------------- P R E S E N C E -----------------
      onlineUsers.add(userId);

      socket.send(JSON.stringify({
        type: "presence_snapshot",
        users: Array.from(onlineUsers),
      }));

      const presencePayload = JSON.stringify({
        type: "presence_update",
        userId,
        status: "online",
      });

      for (const [id, client] of clients) {
        if (id !== userId && client.readyState === client.OPEN) {
          client.send(presencePayload);
        }
      }
      // ---------------------------------------------------

      // ============ INCOMING MESSAGES ============
      socket.on("message", async (raw) => {
        try {
          if (raw instanceof Buffer) return;
          const parsed = JSON.parse(raw.toString());

          // ---- GLOBAL CHAT ----
          if (parsed.type === "global_message") {
            const text = (parsed.text || "").trim();
            if (!text) return;

            const saved = await prisma.chatMessage.create({
              data: { text, authorId: userId },
              include: { author: true },
            });

            const payload = JSON.stringify({
              type: "global_message",
              message: {
                id: saved.id,
                text: saved.text,
                createdAt: saved.createdAt,
                edited: saved.edited,
                authorId: saved.authorId,
                author: {
                  id: saved.author.id,
                  username: saved.author.username,
                  avatarUrl: saved.author.avatarUrl,
                  role: saved.author.role,
                },
              },
            });

            for (const client of clients.values()) {
              if (client.readyState === client.OPEN) client.send(payload);
            }
            return;
          }

// ---- EDIT MESSAGE ----
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

  const payload = JSON.stringify({
    type: "chat_edit",
    message: {
      id: updated.id,
      text: updated.text,
      edited: updated.edited,
      createdAt: updated.createdAt,
      authorId: updated.authorId,
      reactions: updated.reactions,   // << ADDED
      author: {
        id: updated.author.id,
        username: updated.author.username,
        avatarUrl: updated.author.avatarUrl,
      },
    },
  });

  for (const client of clients.values()) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
  return;
}


// ---- REACT MESSAGE (TOGGLE) ----
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
    select: { emoji: true, userId: true },
  });

  const payload = JSON.stringify({
    type: "chat_reaction",
    messageId,
    reactions: updatedReactions
  });

  for (const client of clients.values()) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
  return;
}

          // ---- DIRECT MESSAGE ----
          if (parsed.type === "dm_message") {
            const text = (parsed.text || "").trim();
            const toId = parsed.toId;
            if (!text || !toId) return;

            const savedDm = await prisma.dmMessage.create({
              data: { fromId: userId, toId, text },
              include: { from: true, to: true },
            });

            const dmPayload = JSON.stringify({
              type: "dm_message",
              message: savedDm,
            });

            const fromSocket = clients.get(userId);
            if (fromSocket?.readyState === fromSocket.OPEN) fromSocket.send(dmPayload);

            const toSocket = clients.get(toId);
            if (toSocket?.readyState === toSocket.OPEN) toSocket.send(dmPayload);

            return;
          }

        } catch (err) {
          console.error("WS chat error:", err);
        }
      });

      socket.on("close", () => {
        clients.delete(userId);
        onlineUsers.delete(userId);

        const payload = JSON.stringify({
          type: "presence_update",
          userId,
          status: "offline",
        });

        for (const client of clients.values()) {
          if (client.readyState === client.OPEN) client.send(payload);
        }
      });

    } catch (err) {
      console.error("WS error:", err);
      socket.close();
    }
  });

  return wss;
}

module.exports = { createWSServer };