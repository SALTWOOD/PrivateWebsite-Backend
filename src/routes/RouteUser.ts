import { UserEntity } from "../database/UserEntity.js";
import JwtHelper from "../JwtHelper.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteUser {
    public static register(inst: RouteFactory) {
        inst.app.get("/api/user", async (req, res) => {
            const obj = JwtHelper.instance.verifyToken(req.cookies.token, "user");
            const id = (obj as { userId: number }).userId || -1;
            const user = inst.db.getEntity(UserEntity, id);
            if (user) {
                res.json(user);
            } else {
                res.status(404).json({ message: "User not found" });
            }
        });
    }
}