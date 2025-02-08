import { Config } from "./Config.js";
import { Server } from "./Server.js";
import { existsSync, mkdirSync } from "fs";

function onStop(signal: string) {
    server.stop();
    console.log(`Received ${signal}. Shutting down...`);
    process.exit(0);
}

process.on("SIGINT", onStop);
process.on("SIGTERM", onStop);

const server = new Server();
await server.init();
server.start();