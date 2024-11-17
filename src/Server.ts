import express, { Express } from 'express';
import { SQLiteHelper } from './database/SQLiteHelper.js';
import { RouteFactory } from './routes/RouteFactory.js';
import got, { Got } from 'got';
import { Config } from './Config.js';
import { UserEntity } from './database/UserEntity.js';
import cookieParser from 'cookie-parser';
import { Article } from './database/Article.js';
import path from 'path';

// @ts-ignore
await import('express-async-errors');

export class Server {
    private app: Express;
    private db: SQLiteHelper;
    private got: Got;

    constructor() {
        this.app = express();
        this.db = new SQLiteHelper("./data/database.sqlite");
        this.got = got.extend({
            headers: {
                'user-agent': `PrivateWebsite-Backend/${Config.version} (TypeScript; Node.js/${process.version}; SALTWOOD/PrivateWebsite-Backend)`
            }
        });

        this.db.createTable<UserEntity>(UserEntity);
        this.db.createTable<Article>(Article);

        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());

        this.app.use('/assets', express.static(path.resolve('./assets')));
        const factory = new RouteFactory(this.app, this.db, this.got);
        factory.factory();
    }

    public start(): void {  
        this.app.listen(Config.instance.network.port, Config.instance.network.host);
    }
}