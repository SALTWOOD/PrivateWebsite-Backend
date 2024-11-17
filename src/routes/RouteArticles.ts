import { Article } from "../database/Article.js";
import { UserEntity } from "../database/UserEntity.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";
import { createHash } from "crypto";

export class RouteArticles {
    public static register(inst: RouteFactory): void {
        inst.app.get("/api/articles", async (req, res) => {
            const articles = await inst.db.getEntities<Article>(Article);
            res.json(articles.map(a => {
                const author = inst.db.getEntity<UserEntity>(UserEntity, a.author);
                return {
                    authorName: author?.username || "Unknown",
                    ...a.getJson()
                };
            }));
        });

        inst.app.get("/api/articles/:id", async (req, res) => {
            const articleId = req.params.id;
            const article = await inst.db.getEntity<Article>(Article, articleId);
            if (article) {
                res.json({
                    authorName: inst.db.getEntity<UserEntity>(UserEntity, article.author)?.username || "Unknown",
                    ...article.getJson()
                });
            } else {
                res.status(404).json({ error: "Article not found" });
            }
        });

        inst.app.post("/api/articles", async (req, res) => {
            const user = Utilities.getUser(req, inst.db);
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
                published: boolean,
                background: string
            };

            const num = inst.db.getEntities(Article).map(a => a.id).reduce((a, b) => Math.max(a, b), 0) + 1;

            const newArticle = new Article();
            newArticle.title = article.title;
            newArticle.content = article.content;
            newArticle.published = Number(article.published);
            newArticle.author = user.id;
            newArticle.background = article.background;
            newArticle.id = num;
            newArticle.hash = createHash("sha256").update(newArticle.content).digest("hex");

            inst.db.insert(newArticle);
            res.json(newArticle.getJson());
        });

        inst.app.put("/api/articles/:id", async (req, res) => {
            const user = Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            if (user.permission < 1) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
            const article = req.body as {
                id: number,
                title: string | undefined,
                content: string | undefined,
                published: boolean | undefined,
                background: string | undefined,
                oldHash: string
            };

            const oldArticle = await inst.db.getEntity(Article, article.id);
            if (!oldArticle) {
                res.status(404).json({ error: "Article not found" });
                return;
            }
            if (oldArticle.hash !== article.oldHash) {
                res.status(409).json({ error: "Conflict" });
                return;
            }

            const newArticle = oldArticle;
            if (article.title !== undefined) newArticle.title = article.title;
            if (article.content !== undefined) newArticle.content = article.content;
            if (article.published !== undefined) newArticle.published = Number(article.published);
            if (article.background !== undefined) newArticle.background = article.background;
            newArticle.author = user.id;
            newArticle.id = article.id;

            inst.db.update(newArticle);
            res.json(newArticle.getJson());
        });

        inst.app.delete("/api/articles/:id", async (req, res) => {
            const user = Utilities.getUser(req, inst.db);
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
        });
    }
}