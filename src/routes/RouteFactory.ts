import { Express } from 'express';
import { SQLiteHelper } from '../database/SQLiteHelper.js';
import { RouteAuth } from './RouteAuth.js';
import got, { type Got } from 'got';
import { RouteUser } from './RouteUser.js';
import { RouteSite } from './RouteSite.js';
import { RouteArticles } from './RouteArticles.js';
import { RouteUpload } from './RouteUpload.js';
import { RouteRss } from './RouteRss.js';
import { RssFeed } from '../RssFeed.js';
import { Article } from '../database/Article.js';

export class RouteFactory {
    public app: Express;
    public db: SQLiteHelper;
    public got: Got
    public rss: RssFeed;

    constructor(app: Express, db: SQLiteHelper, got: Got) {
        this.app = app;
        this.db = db;
        this.got = got;
        this.rss = new RssFeed(() => db.getEntities<Article>(Article));
    }

    public factory(): void {
        RouteAuth.register(this);
        RouteUser.register(this);
        RouteSite.register(this);
        RouteArticles.register(this);
        RouteUpload.register(this);
        RouteRss.register(this);
    }
}