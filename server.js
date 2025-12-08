const { createServer } = require("http");
const next = require("next");
const { createWSServer } = require("./lib/wsServer");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // 🔥 WebSocket bekapcsolása
  createWSServer(server);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => console.log("🚀 Server + WS running on http://localhost:" + PORT));
});
