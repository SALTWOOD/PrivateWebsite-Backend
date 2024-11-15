import express, { Express } from 'express';
import { SQLiteHelper } from './database/SQLiteHelper.js';
import { RouteFactory } from './routes/RouteFactory.js';

// @ts-ignore
await import('express-async-errors');

export class Server {
    private app: Express;
    private db: SQLiteHelper;

    constructor() {
        this.app = express();
        this.db = new SQLiteHelper("./data/database.sqlite");
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        const factory = new RouteFactory(this.app, this.db);
        factory.factory();
    }
}