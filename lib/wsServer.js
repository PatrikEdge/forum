const { WebSocketServer } = require("ws");
const prisma = require("./prisma").prisma;
const { parseAuthToken } = require("./auth");

const clients = new Map();

function createWSServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (socket, req) => {
    try {
      const cookie = req.headers.cookie || "";
      const token = cookie.split("token=")[1]?.split(";")[0];

      if (!token) return socket.close();
      const user = parseAuthToken(token);
      if (!user) return socket.close();

      clients.set(user.id, socket);

      socket.on("message", async (data) => {
        try {
          const parsed = JSON.parse(data.toString());

          if (parsed.type === "global_message") {
            const saved = await prisma.chatMessage.create({
              data: {
                message: parsed.text,
                userId: user.id,
              },
              include: { user: true },
            });

            const payload = JSON.stringify({
              type: "global_message",
              message: {
                id: saved.id,
                text: saved.message,
                createdAt: saved.createdAt,
                user: {
                  id: saved.user.id,
                  username: saved.user.username,
                  avatarUrl: saved.user.avatarUrl,
                },
              },
            });

            for (const client of clients.values()) {
              client.send(payload);
            }
          }
        } catch (err) {
          console.error("WS chat error:", err);
        }
      });

      socket.on("close", () => clients.delete(user.id));
    } catch (err) {
      console.error("WS Error:", err);
      socket.close();
    }
  });

  return wss;
}

module.exports = { createWSServer };
