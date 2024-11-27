import express, { Express } from 'express';
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
import { Request, Response, NextFunction } from 'express';
import { Comment } from './database/Comment.js';

// @ts-ignore
await import('express-async-errors');

// 创建一个中间件函数
const logMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 调用下一个中间件
    next();

    // 在响应完成后记录访问日志
    res.on('finish', () => {
        logAccess(req, res);
    });
};

const logAccess = (req: Request, res: Response) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    console.log(`${req.method} ${req.originalUrl} ${req.protocol} <${res.statusCode}> - [${ip}] ${userAgent}`);
};

export class Server {
    private app: Express;
    private db: IDatabase;
    private got: Got;
    // @ts-ignore
    private rss: RssFeed;

    constructor() {
        this.app = express();
        this.db = new MySqlHelper(
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
        await this.db.createTable<Comment>(Comment);

        this.rss = new RssFeed(async () => await this.db.getEntities<Article>(Article));

        this.setupRoutes();
    }

    private setupRoutes(): void {
        if (Config.instance.network.trust_proxy) this.app.set('trust proxy', 'loopback');

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(logMiddleware);

        this.app.use('/assets', express.static(path.resolve('./assets')));
        const factory = new RouteFactory(this.app, this.db, this.got, this.rss);
        factory.factory();
    }

    public start(): void {  
        this.app.listen(Config.instance.network.port, Config.instance.network.host);
    }
}