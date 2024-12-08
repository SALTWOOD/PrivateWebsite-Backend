import { Config } from "../Config.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteSite {
    public static register(inst: RouteFactory): void {
        inst.app.get("/api/site/info", async (req, res) => {
            res.json(Config.instance.site_information);
        });

        inst.app.get("/api/site/friends", async (req, res) => {
            res.json(Config.instance.site.friends);
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
    }
}