import { UserEntity } from "../database/UserEntity.js";
import JwtHelper from "../JwtHelper.js";
import { RouteFactory } from "./RouteFactory.js";
import { Request, Response } from "express";

export class RouteUser {
    public static register(inst: RouteFactory) {
        inst.app.get("/api/user", async (req: Request, res: Response) => {
            const obj = JwtHelper.instance.verifyToken(req.cookies["pw-token"], "user");
            if (!obj) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const id = (obj as { userId: number }).userId || -1;
            const user = await inst.db.getEntity(UserEntity, id);
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ message: "User not found" });
            }
        });
    }
}