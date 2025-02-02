import { NextFunction, Request, Response } from "express";
import { UserEntity } from "./database/UserEntity.js";
import JwtHelper from "./JwtHelper.js";
import { IDatabase } from "./database/IDatabase.js";
import { Article } from "./database/Article.js";
import { Comment } from "./database/Comment.js";
import { Constants } from "./Constants.js";

export class Utilities {
    public static MAX_DEPTH = 4;

    public static getDate(after: number = 0, unit: "ms" | "s" | "min" | "hour" | "day" | "month" | "year" = "day"): Date {
        switch (unit) {
            case "ms":
                return new Date(Date.now() + after);
            case "s":
                return new Date(Date.now() + after * 1000);
            case "min":
                return new Date(Date.now() + after * 60 * 1000);
            case "hour":
                return new Date(Date.now() + after * 60 * 60 * 1000);
            case "day":
                return new Date(Date.now() + after * 24 * 60 * 60 * 1000);
            case "month":
                return new Date(Date.now() + after * 30 * 24 * 60 * 60 * 1000);
            case "year":
                return new Date(Date.now() + after * 365 * 24 * 60 * 60 * 1000);
        }
    }

    public static async checkCommentChainDepth(comment: Comment, db: IDatabase): Promise<boolean> {
        let depth = 0;
        let currentParent = comment;

        while (currentParent.parent !== null) {
            let current = await db.getEntity<Comment>(Comment, currentParent.parent);

            if (!current) {
                break;
            }
            currentParent = current;
            depth++;
            if (depth >= this.MAX_DEPTH) return false;
        }

        return true;
    }

    public static async getReplies(parentId: number | null, article: Article, db: IDatabase, depth: number = 0): Promise<(Comment & { user: UserEntity | null })[]> {
        if (depth >= this.MAX_DEPTH) return [];

        // 获取子评论
        const childComments = parentId === null
            ? await db.select<Comment>(Comment, ['*'], "parent IS NULL AND article = ?", [article.id])
            : await db.select<Comment>(Comment, ['*'], "parent = ? AND article = ?", [parentId, article.id]);

        // 递归查询子评论的子评论
        for (let comment of childComments) {
            comment.replies = await this.getReplies(comment.id, article, db, depth + 1);
        }

        return await Promise.all(childComments.map(async comment => ({
            ...comment.getJson(true, false),
            user: await db.getEntity(UserEntity, comment.user) || null,
            getJson: comment.getJson
        })));
    };

    public static async getUser(req: Request, db: IDatabase): Promise<UserEntity | null> {
        try {
            const token = req.cookies[Constants.TOKEN_NAME];
            const data = JwtHelper.instance.verifyToken(token, Constants.TOKEN_USER_AUDIENCE) as { userId: number };
            const id = data.userId;
            const user = await db.getEntity(UserEntity, id);
            if (user) {
                return user;
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }

    public static async isLoggedIn(req: Request, db: IDatabase): Promise<boolean> {
        return (await this.getUser(req, db)) !== null;
    }

    public static async isAdmin(req: Request, db: IDatabase): Promise<boolean> {
        const user = await this.getUser(req, db);
        return Boolean(user && (user?.permission >= 1));
    }

    public static needUser(db: IDatabase): (req: Request, res: Response, next: NextFunction) => Promise<void> {
        return async (req, res, next) => {
            if (await this.isLoggedIn(req, db)) {
                next();
                return;
            }
            res.status(401).json({ error: "Unauthorized" });
        }
    }

    public static needAdmin(db: IDatabase): (req: Request, res: Response, next: NextFunction) => Promise<void> {
        return async (req, res, next) => {
            if (await this.isAdmin(req, db)) {
                next();
                return;
            }
            res.status(403).json({ error: "Forbidden" });
        }
    };
}

export const logAccess = (req: Request, res: Response) => {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip;
    console.log(`${req.method} ${req.originalUrl} ${req.protocol} <${res.statusCode}> - [${ip}] ${userAgent}`);
};