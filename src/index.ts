import { Server } from "./Server.js";
import { mkdirSync } from "fs";

const requiredFolders = [
    "assets",
    "assets/uploads",
    "data"
];

for (const folder of requiredFolders) {
    mkdirSync(folder, { recursive: true });
}

const server = new Server();
await server.init();
server.start();