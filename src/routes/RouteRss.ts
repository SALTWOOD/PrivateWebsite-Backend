import { Article } from "../database/Article.js";
import { RouteFactory } from "./RouteFactory.js";
import { Request, Response } from "express";

export class RouteRss {
    public static register(inst: RouteFactory) {
        inst.app.get("/api/rss", async (req: Request, res: Response) => {
            res.header("Content-Type", "application/xml");
            res.send(inst.rss.data);
        })
    }
}