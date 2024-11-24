import { createHash } from "crypto";
import { Article } from "../database/Article.js";
import { Comment } from "../database/Comment.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";
import { Request, Response } from "express";

export class RouteComment {
    public static register(inst: RouteFactory): void {

        inst.app.get('/api/comment/:id', async (req: Request, res: Response) => {
            const id = Number(req.params.id) || 0;
            const comment = await inst.db.select<Comment>(Comment, ['*'], `article = ${id}`);
            res.json(comment);
        });

        inst.app.post('/api/comment/:id', async (req: Request, res: Response) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const articleId = Number(req.params.id) || 0;
            let articles: Article[] = [];

            if ((articles = await inst.db.select<Article>(Article, ['id'], `id = ${articleId}`)).length === 0) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }

            const body = req.body as {
                content: string,
                parent: number
            };

            const comment = Comment.create(user, body.content, body.parent, articles[0]);

            const parent = await inst.db.select<Comment>(Comment, ['article'], `id = ${comment.parent}`);
            if (parent.length === 0 || parent.some(p => p.article !== articles[0].id)) {
                res.status(400).json({ error: 'Invalid parent comment' });
            }

            const id = await inst.db.insert<Comment>(comment);
            comment.id = id;
            res.json(comment);
        });

        inst.app.put('/api/comment/:id/:comment', async (req: Request, res: Response) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const body = req.body as {
                content: string,
                hash: string
            };

            const id = Number(req.params.id) || 0;
            const commentId = Number(req.params.comment) || 0;
            const comments = await inst.db.select<Comment>(Comment, ['*'], `id = ${commentId} AND article = ${id}`);

            if (comments.length === 0) {
                res.status(404).json({ error: 'Comment not found' });
                return;
            }

            if (comments[0].user !== user.id) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }

            const comment = comments[0];
            if (createHash('sha1').update(comment.content).digest('hex') !== body.hash) {
                res.status(409).json({ error: 'Conflict' });
                return;
            }

            comment.content = body.content;
            comment.hash = createHash('sha1').update(comment.content).digest('hex');

            await inst.db.update<Comment>(comment);
            res.json(comment);
        });

        inst.app.delete('/api/comment/:id', async (req: Request, res: Response) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const id = Number(req.params.id) || 0;
            const comments = await inst.db.select<Comment>(Comment, ['*'], `id = ${id}`);

            if (comments.length === 0) {
                res.status(404).json({ error: 'Comment not found' });
                return;
            }

            if (comments[0].user !== user.id) {
                res.status(403).json({ error: 'Forbidden' });
                return;
            }
            
            const comment = comments[0];
            await inst.db.remove<Comment>(Comment, comment);
            res.json({ success: true });
        });
    }
}