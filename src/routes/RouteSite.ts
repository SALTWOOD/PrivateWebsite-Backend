import { title } from "process";
import { Config } from "../Config.js";
import { RouteFactory } from "./RouteFactory.js";
import { FriendLink } from "../database/FriendLink.js";

export class RouteSite {
    public static register(inst: RouteFactory): void {
        inst.app.get("/api/site/info", async (req, res) => {
            if (!Config.instance.site.info) {
                res.json({
                    title: "未命名",
                    bio: "这里还什么都没有……"
                });
                return;
            }
            // 判断 Config.instance.site.info.bio 的类型。array 就随机抽选一个像上面一样返回。string 就直接跟上面一样返回。
            if (Array.isArray(Config.instance.site.info.bio)) {
                const random = Config.instance.site.info.bio[Math.floor(Math.random() * Config.instance.site.info.bio.length)];
                res.json({
                    title: Config.instance.site.info.title || "未命名",
                    bio: random
                });
            }
            else if (typeof Config.instance.site.info.bio === "string")
                res.json({
                    title: Config.instance.site.info.title || "未命名",
                    bio: Config.instance.site.info.bio
                });
            else res.status(500).send("Invalid bio type");
        });

        inst.app.get("/api/site/friends", async (req, res) => {
            res.json(await inst.db.getEntities<FriendLink>(FriendLink));
        });

        inst.app.get("/api/site/random_background", async (req, res) => {
            const type = (req.query.type as "redirect" | "json") || "json";
            const backgrounds = Config.instance.backgrounds;
            const random = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            if (type === "redirect") {
                res.redirect(random);
            }
            else if (type === "json") {
                // 随机抽一个元素
                res.json({
                    url: random
                });
            }
            else {
                res.status(400).send("Invalid type");
            }
        });

        inst.app.get("/api/site/sidebar", async (req, res) => {
            if (!Config.instance.site.sidebar) {
                res.json([]);
                return;
            }
            res.json(Config.instance.site.sidebar);
        });
    }
}