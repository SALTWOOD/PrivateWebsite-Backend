import { assert } from "console";
import { Config } from "../Config.js";
import { Article } from "../database/Article.js";
import { RouteFactory } from "./RouteFactory.js";
import path from "path";

export class RouteRoot {
    public static register(inst: RouteFactory) {
        inst.app.get("/robots.txt", async (req, res) => {
            res.type("text/plain");
            res.send(`# Privaite-Website
User-agent: *
Allow: /main/
Disallow: /api/
Disallow: /main/node_modules/
Disallow: /main/dist/
Disallow: /main/src/

Sitemap: ${req.protocol}://${Config.instance.network.remoteHost}:${Config.instance.network.remotePort}/sitemap.xml`);
        });

        inst.app.get("/sitemap.xml", async (req, res) => {
            const baseUrl = `${req.protocol}://${Config.instance.network.remoteHost}:${Config.instance.network.remotePort}`;

            // 获取所有文章
            const pages: {
                url: string,
                lastmod?: string,
                changefreq?: string,
                priority?: number
            }[] = (await inst.db.getEntities<Article>(Article)).filter(a => a.published).map(a => ({
                url: `${baseUrl}/main/article/${a.id}`,
                lastmod: new Date(a.lastUpdated).toISOString(),
                priority: 0.6
            }));

            pages.push({
                url: `${baseUrl}/main`,
                changefreq: "weekly",
                priority: 1
            });

            // 构建 Sitemap XML 内容
            const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
            const urlsetStart = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
            const urlsetEnd = `</urlset>`;

            // 生成每个 URL 的 XML 节点
            let url = "";
            pages.forEach(page => {
                url += "    <url>\n";
                url += `        <loc>${page.url}</loc>\n`;
                if (page.lastmod) url += `        <lastmod>${page.lastmod}</lastmod>\n`;
                if (page.changefreq) url += `        <changefreq>${page.changefreq}</changefreq>\n`;
                if (page.priority) url += `        <priority>${page.priority}</priority>\n`;
                url += "    </url>\n";
            });

            // 完整的 XML 内容
            const sitemapXml = `${xmlHeader}\n${urlsetStart}\n${url}${urlsetEnd}`;

            // 设置响应头并返回 XML 内容
            res.type("application/xml");
            res.send(sitemapXml);
        });

        inst.app.get("/favicon.ico", async (req, res) => {
            res.sendFile(path.resolve("./data/favicon.ico"));
        });
    }
}
