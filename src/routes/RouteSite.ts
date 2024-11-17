import { Config } from "../Config.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteSite {
    public static register(inst: RouteFactory): void {
        inst.app.get("/api/site/info", async (req, res) => {
            res.json(Config.instance.site_information);
        });
    }
}