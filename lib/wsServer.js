import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}

// =======================
// SECURITY CONSTANTS
// =======================

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
]);

const MAX_CONN_PER_IP = 5;
const MAX_PAYLOAD = 64 * 1024; // 64 KB
const HEARTBEAT_INTERVAL = 30_000;

const MSG_LIMIT = 20;
const MSG_WINDOW = 10_000;

// =======================
// STATE
// =======================

/** userId -> WebSocket */
const clients = new Map();

/** userId set */
const onlineUsers = new Set();

/** ip -> connection count */
const ipConnections = new Map();

/** userId -> { count, ts } */
const messageRate = new Map();

// =======================
// HELPERS
// =======================

function parseAuthToken(token) {
  try {
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload !== "object") return null;
    if (!payload.id) return null;
    return { id: payload.id };
  } catch {
    return null;
  }
}

function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function heartbeat() {
  this.isAlive = true;
}

// =======================
// WS SERVER
// =======================

export function createWSServer() {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD,
  });

  // expose globally for broadcast helpers
  globalThis.__WSS__ = wss;

  // -------- HEARTBEAT --------
  setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", async (socket, req) => {
    // -------- ORIGIN CHECK --------
    const origin = req.headers.origin;
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      socket.close();
      return;
    }

    // -------- IP LIMIT --------
    const ip = getIP(req);
    const count = ipConnections.get(ip) || 0;
    if (count >= MAX_CONN_PER_IP) {
      socket.close();
      return;
    }
    ipConnections.set(ip, count + 1);

    // -------- AUTH --------
    const cookie = req.headers.cookie || "";
    const token = cookie
      .split(";")
      .map(v => v.trim())
      .find(v => v.startsWith("token="))
      ?.slice("token=".length);

    const user = parseAuthToken(token);
    if (!user) {
      socket.close();
      return;
    }

    const userId = user.id;

    socket.isAlive = true;
    socket.on("pong", heartbeat);

    clients.set(userId, socket);
    onlineUsers.add(userId);

    // 🔥 LAST ONLINE – CONNECT
  await prisma.user.update({
    where: { id: userId },
    data: { lastOnlineAt: new Date() },
  });

    // -------- PRESENCE --------
    broadcastAll({
      type: "presence_snapshot",
      users: Array.from(onlineUsers),
    });

    broadcastExcept(userId, {
      type: "presence_update",
      userId,
      status: "online",
    });

    // -------- MESSAGE HANDLER --------
    socket.on("message", async raw => {
      if (raw instanceof Buffer) return;

      // ---- RATE LIMIT ----
      const now = Date.now();
      const rate = messageRate.get(userId) || { count: 0, ts: now };

      if (now - rate.ts > MSG_WINDOW) {
        rate.count = 0;
        rate.ts = now;
      }

      rate.count++;
      messageRate.set(userId, rate);

      if (rate.count > MSG_LIMIT) return;

      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;
      if (typeof data.type !== "string") return;

      // -------- GLOBAL MESSAGE --------
      if (data.type === "global_message") {
        if (typeof data.text !== "string") return;
        const text = data.text.trim();
        if (!text || text.length > 2000) return;

        const saved = await prisma.chatMessage.create({
          data: {
            text,
            authorId: userId,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        });

        broadcastAll({
          type: "global_message",
          message: {
            id: saved.id,
            text: saved.text,
            createdAt: saved.createdAt,
            author: saved.author,
          },
        });

        return;
      }
    });

    // -------- CLOSE --------
socket.on("close", async () => {
  clients.delete(userId);
  onlineUsers.delete(userId);

  const current = ipConnections.get(ip) || 1;
  ipConnections.set(ip, Math.max(0, current - 1));

  // 🔥 LAST ONLINE – DISCONNECT
  await prisma.user.update({
    where: { id: userId },
    data: { lastOnlineAt: new Date() },
  });

  broadcastAll({
    type: "presence_update",
    userId,
    status: "offline",
  });
});
  });

  return wss;
}

// =======================
// BROADCAST HELPERS
// =======================

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
    if (id !== userId && socket.readyState === 1) {
      socket.send(payload);
    }
  }
}
