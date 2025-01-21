import { FriendLink } from "../database/FriendLink.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteFriends {
    public static register(inst: RouteFactory) {
        inst.app.get("/api/friends", async (req, res) => {
            const friends = await inst.db.getEntities<FriendLink>(FriendLink);
            res.json(friends);
        });

        inst.app.post("/api/friends", async (req, res) => {
            const friend = req.body as FriendLink;

            if (typeof req.body.name !== "string"
                || typeof req.body.url!== "string"
                || typeof req.body.avatar === "string"
                || typeof req.body.description!== "string") {
                res.status(400).json({ error: "Invalid input" });
                return;
            }

            const id = await inst.db.insert<FriendLink>(FriendLink, friend);
            friend.id = id;
            res.json(friend);
        });

        inst.app.delete("/api/friends/:id", async (req, res) => {
            const id = parseInt(req.params.id);
            const friend = await inst.db.getEntity<FriendLink>(FriendLink, id);

            if (Number.isNaN(id)) {
                res.status(400).json({ error: "Invalid input", id: req.params.id });
                return;
            }
            if (!friend) {
                res.status(404).json({ error: "Friend not found", id });
                return;
            }

            await inst.db.remove<FriendLink>(FriendLink, friend);
            res.json({ message: "Friend deleted", friend });
        });
    }
}