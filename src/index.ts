import { Server } from "./Server.js";
import { mkdirSync } from "fs";

function onStop(signal: string) {
    server.stop();
    console.log(`Received ${signal}. Shutting down...`);
    process.exit(0);
}

const requiredFolders = [
    "assets",
    "assets/uploads",
    "assets/backgrounds",
    "data"
];

for (const folder of requiredFolders) {
    mkdirSync(folder, { recursive: true });
}

process.on("SIGINT", onStop);
process.on("SIGTERM", onStop);

const server = new Server();
await server.init();
server.start();