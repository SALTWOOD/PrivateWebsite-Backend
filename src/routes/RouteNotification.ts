import { Comment } from "../database/Comment.js";
import { mysqlTableNameMap } from "../database/IDatabase.js";
import { UserEntity } from "../database/UserEntity.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteNotification {
    public static VARIABLE: string = "comment";
    public static SQL_WHERE_CLAUSE = `
    comment.user != ? AND (
        (
            EXISTS (
                SELECT 1
                FROM comments parent
                WHERE parent.id = comment.parent
                AND parent.user = ?
            )
            AND comment.createdAt > ?
        ) OR (
            EXISTS (
                SELECT 1
                FROM articles article
                WHERE article.id = comment.article
                AND article.author = ?
            )
        )
    )`;

    public static getParams(user: UserEntity) {
        return [user.id, user.id, user.lastRead, user.id];
    }

    public static register(inst: RouteFactory) {
        inst.app.get("/api/notifications", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }

            const notifications = await inst.db.select<Comment>(Comment, ["*"], this.SQL_WHERE_CLAUSE, this.getParams(user), this.VARIABLE);

            res.json(notifications);
        });

        inst.app.get("/api/notifications/count", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }

            const count = await inst.db.count<Comment>(Comment, this.SQL_WHERE_CLAUSE, this.getParams(user), this.VARIABLE);
            res.json({ count });
        });

        inst.app.post("/api/notifications/mark_read", async (req, res) => {
            const user = await Utilities.getUser(req, inst.db);
            if (!user) {
                res.status(401).send("Unauthorized");
                return;
            }
            
            user.lastRead = Date.now();
            await inst.db.update<UserEntity>(UserEntity, user);

            res.json({ success: true });
        });
    }
}