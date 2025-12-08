const http = require("http");
const { createWSServer } = require("./lib/wsServer");

const server = http.createServer();
createWSServer(server);

server.listen(3000, () => {
  console.log("WS Server running on ws://localhost:3000");
});
