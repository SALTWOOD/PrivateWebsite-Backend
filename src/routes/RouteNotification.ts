import { Comment } from "../database/Comment.js";
import { mysqlTableNameMap } from "../database/IDatabase.js";
import { UserEntity } from "../database/UserEntity.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteNotification {
    public static VARIABLE: string = "comment";
    public static getSql(getAll: boolean = false) {
        return `
        comment.user != ? AND (
            (
                EXISTS (
                    SELECT 1
                    FROM comments parent
                    WHERE parent.id = comment.parent
                    AND parent.user = ?
                )
            ) OR (
                EXISTS (
                    SELECT 1
                    FROM articles article
                    WHERE article.id = comment.article
                    AND article.author = ?
                )
            )
        )
        ${getAll? "" : "AND comment.createdAt > ?"}`;
    }

    public static getParams(user: UserEntity, getAll: boolean = false) {
        if (getAll) return [user.id, user.id, user.id];
        return [user.id, user.id, user.id, user.lastRead];
    }

    public static register(inst: RouteFactory) {
        inst.app.get("/api/notifications", async (req, res) => {
            const all = String(req.query.all || "false").toLowerCase() === "true";
            const page = Number(req.query.page) || 0;
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }

            const notifications = await inst.db.select<Comment>(Comment, ["*"], this.getSql(all), this.getParams(user, all), this.VARIABLE);

            const data = await Promise.all(notifications.slice(page * 10, (page + 1) * 10).map(async n => ({
                ...n.getJson(true),
                user: await inst.db.getEntity<UserEntity>(UserEntity, n.user),
                read: n.createdAt <= user.lastRead
            })));

            res.json({
                page: page,
                total: notifications.length,
                current: [page * 10, (page + 1) * 10],
                data
            });
        });

        inst.app.get("/api/notifications/count", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }

            const count = await inst.db.count<Comment>(Comment, this.getSql(), this.getParams(user), this.VARIABLE);
            res.json({ count });
        });

        inst.app.post("/api/notifications/mark_as_read", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }
            
            user.lastRead = new Date();
            await inst.db.update<UserEntity>(UserEntity, user);

            res.json({ success: true });
        });
    }
}