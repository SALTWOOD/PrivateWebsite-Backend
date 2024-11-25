import { Article } from "../database/Article.js";
import { UserEntity } from "../database/UserEntity.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";
import { createHash } from "crypto";

export class RouteArticles {
    public static register(inst: RouteFactory): void {
        inst.app.use("/api/articles", async (req, res, next) => {
            if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
                await inst.rss.notify();
            }
            next();
        });

        inst.app.get("/api/articles", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);

            const articles = await inst.db.getEntities<Article>(Article);

            const query = articles.filter(a => a.published || (user && (a.author === user?.id || user.permission >= 1))).map(async a => {
                const author = await inst.db.getEntity<UserEntity>(UserEntity, a.author);
                return {
                    authorName: author?.username || "Unknown",
                    ...a.getJson(true)
                };
            });

            res.json(await Promise.all(query));
        });

        inst.app.get("/api/articles/:id", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            const articleId = req.params.id;
            const article = await inst.db.getEntity<Article>(Article, articleId);
            if (article) {
                if (!article.published && (user && (article.author !== user.id && user.permission < 1))) {
                    res.status(403).json({ error: "Forbidden" });
                    return;
                }
                res.json({
                    authorName: (await inst.db.getEntity<UserEntity>(UserEntity, article.author))?.username || "Unknown",
                    ...article.getJson()
                });
            } else {
                res.status(404).json({ error: "Article not found" });
            }
        });

        inst.app.post("/api/articles", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            if (user.permission < 1) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
            const article = req.body as {
                title: string,
                content: string,
                description: string,
                published: boolean,
                background: string
            };

            const newArticle = new Article();
            newArticle.title = article.title;
            newArticle.content = article.content;
            newArticle.description = article.description;
            newArticle.published = article.published;
            newArticle.author = user.id;
            newArticle.background = article.background;
            newArticle.hash = createHash("sha256").update(newArticle.content).digest("hex");
            newArticle.lastUpdated = Date.now();

            const id = await inst.db.insert(Article, newArticle);
            newArticle.id = id;
            await inst.rss.notify();
            
            res.json(newArticle.getJson());
        });

        inst.app.put("/api/articles/:id", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const article = req.body as {
                id: number,
                title: string | undefined,
                content: string | undefined,
                description: string | undefined,
                published: boolean | undefined,
                background: string | undefined,
                oldHash: string
            };

            const oldArticle = await inst.db.getEntity(Article, article.id);
            if (!oldArticle) {
                res.status(404).json({ error: "Article not found" });
                return;
            }

            if (user.permission < 1 && oldArticle.author !== user.id) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
            if (oldArticle.hash !== article.oldHash) {
                res.status(409).json({ error: "Conflict" });
                return;
            }

            const newArticle = oldArticle;
            if (article.title !== undefined) newArticle.title = article.title;
            if (article.content !== undefined) newArticle.content = article.content;
            if (article.description !== undefined) newArticle.description = article.description;
            if (article.published !== undefined) newArticle.published = article.published;
            if (article.background !== undefined) newArticle.background = article.background;
            newArticle.lastUpdated = Date.now();

            inst.db.update(Article, newArticle);
            await inst.rss.notify();

            res.json(newArticle.getJson(true));
        });

        inst.app.delete("/api/articles/:id", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            if (user.permission < 1) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
            const articleId = Number(req.params.id);
            const article = await inst.db.getEntity<Article>(Article, articleId);
            if (!article) {
                res.status(404).json({ error: "Article not found" });
                return;
            }
            if (article.author === user.id || user.permission >= 2) {
                inst.db.remove<Article>(Article, article);
                res.json({ success: true });
            } else {
                res.status(403).json({ error: "Forbidden" });
            }

            await inst.rss.notify();
        });
    }
}