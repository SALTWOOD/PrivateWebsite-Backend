import { Express } from 'express';
import { RouteAuth } from './RouteAuth.js';
import got, { type Got } from 'got';
import { RouteUser } from './RouteUser.js';
import { RouteSite } from './RouteSite.js';
import { RouteArticles } from './RouteArticles.js';
import { RouteUpload } from './RouteUpload.js';
import { RouteRss } from './RouteRss.js';
import { RssFeed } from '../RssFeed.js';
import { Article } from '../database/Article.js';
import { IDatabase } from '../database/IDatabase.js';
import { RouteComment } from './RouteComment.js';
import { RouteRoot } from './RouteRoot.js';
import { RouteNotification } from './RouteNotification.js';
import { RouteFriends } from './RouteFriends.js';

export class RouteFactory {
    public app: Express;
    public db: IDatabase;
    public got: Got
    public rss: RssFeed;

    constructor(app: Express, db: IDatabase, got: Got, rss: RssFeed) {
        this.app = app;
        this.db = db;
        this.got = got;
        this.rss = rss;
    }

    public factory(): void {
        RouteAuth.register(this);
        RouteUser.register(this);
        RouteSite.register(this);
        RouteArticles.register(this);
        RouteUpload.register(this);
        RouteRss.register(this);
        RouteComment.register(this);
        RouteRoot.register(this);
        RouteNotification.register(this);
        RouteFriends.register(this);
    }
}