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
import JwtHelper from './JwtHelper.js';
import { Constants, IUserJwt } from './Constants.js';
import { Utilities, logAccess } from './Utilities.js';
import { createServer } from 'http';
import { FriendLink } from './database/FriendLink.js';
import { CronJob } from 'cron';

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

const renewTokenMiddleware = (db: IDatabase): (req: Request, res: Response, next: NextFunction) => Promise<void> => {
    return async (req: Request, res: Response, next: NextFunction) => { 
        // 只有在有 token 且剩余时间小于 7 天的情况下才会进行续期，否则忽略并且继续执行下一个中间件
        const token = req.cookies[Constants.TOKEN_NAME];
        if (!token) return next();

        const tokenPayload = JwtHelper.instance.verifyToken(token) as IUserJwt | null;
        if (!tokenPayload) return next();
        if (new Date(tokenPayload.exp) < Utilities.getDate(7, "day") && tokenPayload.clientId === Config.instance.github.id && Number(tokenPayload.userId)) {
            const newToken = JwtHelper.instance.issueToken({
                userId: Number(tokenPayload.userId),
                clientId: tokenPayload.clientId
            }, Constants.TOKEN_USER_AUDIENCE, Constants.SECONDS_IN_DAY * Config.instance.user.tokenExpiration);
            res.cookie(Constants.TOKEN_NAME, newToken, Constants.GetBrowserCookieOptions());
        };
        next();
    };
}

export class Server {
    private app: Express;
    private db: IDatabase;
    private got: Got;
    // @ts-ignore
    private rss: RssFeed;
    private cronjobs: Map<string, CronJob>;

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

        this.cronjobs = new Map<string, CronJob>();
    }

    public async init(): Promise<void> {
        if (this.db instanceof MySqlHelper) {
            await this.db.init();
        }

        await this.db.createTable<UserEntity>(UserEntity);
        await this.db.createTable<Article>(Article);
        await this.db.createTable<Comment>(Comment);
        await this.db.createTable<FriendLink>(FriendLink);

        this.rss = new RssFeed(async () => (await this.db.getEntities<Article>(Article)).filter(a => a.published));

        this.setupRoutes();

        this.checkFriends().then(() => {
            this.cronjobs.set("friend_check", new CronJob("0 0 * * *",
                this.checkFriends.bind(this),
                null,
                true
            ));
        });
    }

    private async checkFriends(): Promise<void> {
        for (const f of await this.db.getEntities<FriendLink>(FriendLink)) {
            let success: boolean = false;
            for (const count of [1, 2, 3]) {
                try {
                    await got(f.url);
                    success = true;
                    break;
                } catch (err) {
                    console.warn(`Friend link check \"${f.name}\" failed, retrying...(${count}/3)`);
                    console.warn((err as Error).message);
                }
            }
            f.available = success;
            if (success) f.lastAvailable = new Date();
            this.db.update<FriendLink>(FriendLink, f);
        }
    }

    private setupRoutes(): void {
        if (Config.instance.network.trustProxy) this.app.set('trust proxy', true);

        // 基础中间件
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(cookieParser());

        // 扩展中间件
        this.app.use(renewTokenMiddleware(this.db));
        this.app.use(logMiddleware);

        this.app.use('/assets', express.static(path.resolve('./assets')));
        const factory = new RouteFactory(this.app, this.db, this.got, this.rss);
        factory.factory();
    }

    public start(): void {
        this.app.listen(Config.instance.network.port, Config.instance.network.host, () => {
            console.log(`Server started on http://${Config.instance.network.host}:${Config.instance.network.port}`);
        });
    }

    public async stop(): Promise<void> {
        if (this.db instanceof MySqlHelper) {
            await this.db.close();
        }
    }
}