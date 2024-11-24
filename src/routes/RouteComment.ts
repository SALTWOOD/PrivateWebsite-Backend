import { createHash } from "crypto";
import { Article } from "../database/Article.js";
import { Comment } from "../database/Comment.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";
import { Request, Response } from "express";

export class RouteComment {
    public static register(inst: RouteFactory): void {
        inst.app.get('/api/comment/:id', async (req: Request, res: Response) => {
            const page = Number(req.query.page) || 0;
            const id = Number(req.params.id) || 0;
            
            // 获取文章评论
            const article = await inst.db.getEntity<Article>(Article, id);
            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
        
            // 获取顶级评论（没有父评论的评论）
            const comments = await Utilities.getReplies(null, article, inst.db, 0);
            console.log(comments);
        
            res.json({
                page: page,
                total: comments.length,
                current: [page * 10, (page + 1) * 10],
                comments: comments.slice(page * 10, (page + 1) * 10)
            });
        });        

        inst.app.post('/api/comment/:id', async (req: Request, res: Response) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            
            const articleId = Number(req.params.id) || 0;
            const body = req.body as {
                content: string,
                parent: number | null
            };
        
            const article = await inst.db.getEntity<Article>(Article, articleId);
            if (!article) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
        
            let comment = Comment.create(user, body.content, body.parent, article);
        
            if (body.parent !== null) {
                const parent = await inst.db.getEntity<Comment>(Comment, body.parent);
                if (!parent) {
                    res.status(404).json({ error: 'Parent comment not found' });
                    return;
                }
                if (parent.article !== articleId) {
                    res.status(400).json({ error: 'Out of article scope' });
                    return;
                }
        
                if (!await Utilities.checkCommentChainDepth(comment, inst.db)) {
                    res.status(400).json({ error: 'Comment chain depth exceeded' });
                    return;
                }
            }
        
            await inst.db.insert<Comment>(Comment, comment);
            res.json({
                ...comment.getJson(),
                username: user.username
            });
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

            await inst.db.update<Comment>(Comment, comment);
            res.json({
                ...comment.getJson(),
                username: user.username
            });
        });

        inst.app.delete('/api/comment/:id/:commentId', async (req: Request, res: Response) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const id = Number(req.params.commentId) || 0;
            const articleId = Number(req.params.id) || 0;
            const comments = await inst.db.select<Comment>(Comment, ['*'], `id = ${id} AND article = ${articleId}`);

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