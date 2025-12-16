require("ts-node/register/transpile-only");
require("dotenv").config({ path: ".env.local" });

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

  const wss = createWSServer(server);

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url?.split("?")[0];

    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log("Server + WS running on http://localhost:" + PORT);
  });
});
