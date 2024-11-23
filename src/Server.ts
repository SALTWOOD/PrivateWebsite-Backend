import express, { Express } from 'express';
import { SQLiteHelper } from './database/SQLiteHelper.js';
import { RouteFactory } from './routes/RouteFactory.js';
import got, { Got } from 'got';
import { Config } from './Config.js';
import { UserEntity } from './database/UserEntity.js';
import cookieParser from 'cookie-parser';
import { Article } from './database/Article.js';
import path from 'path';
import { IDatabase } from './database/IDatabase.js';
import { MySqlHelper } from './database/MySqlHelper.js';
import { RssFeed } from './RssFeed.js';

// @ts-ignore
await import('express-async-errors');

export class Server {
    private app: Express;
    private db: IDatabase;
    private got: Got;
    // @ts-ignore
    private rss: RssFeed;

    constructor() {
        this.app = express();
        this.db = Config.instance.database.type ==='sqlite'? new SQLiteHelper("./data/database.sqlite") : new MySqlHelper(
            Config.instance.database.host,
            Config.instance.database.port,
            Config.instance.database.username,
            Config.instance.database.password,
            Config.instance.database.database
        );

        this.got = got.extend({
            headers: {
                'user-agent': `PrivateWebsite-Backend/${Config.version} (TypeScript; Node.js/${process.version}; SALTWOOD/PrivateWebsite-Backend)`
            }
        });
    }

    public async init(): Promise<void> {
        if (this.db instanceof MySqlHelper) {
            await this.db.init();
        }

        await this.db.createTable<UserEntity>(UserEntity);
        await this.db.createTable<Article>(Article);

        this.rss = new RssFeed(async () => await this.db.getEntities<Article>(Article));

        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());

        this.app.use('/assets', express.static(path.resolve('./assets')));
        const factory = new RouteFactory(this.app, this.db, this.got, this.rss);
        factory.factory();
    }

    public start(): void {  
        this.app.listen(Config.instance.network.port, Config.instance.network.host);
    }
}