import { Article } from "../database/Article.js";
import { RouteFactory } from "./RouteFactory.js";

export class RouteRoot {
    public static register(inst: RouteFactory) {
        inst.app.get("/robots.txt", async (req, res) => {
            res.type("text/plain");
            res.send(`
User-agent: *
Allow: /main
Disallow: /api
Disallow: /main/node_modules
Disallow: /main/dist
Disallow: /main/src

Sitemap: ${req.protocol}://${req.host}/sitemap.xml
            `);
        });

        inst.app.get("/sitemap.xml", async (req, res) => {
            // 获取所有文章
            const pages: { url: string, lastmod?: string, changefreq?: string }[] = (await inst.db.getEntities<Article>(Article)).map(a => ({
                url: `${req.protocol}://${req.host}/main/article/${a.id}`,
                lastmod: new Date(a.publishedAt).toISOString()
            }));

            pages.push({
                url: `${req.protocol}://${req.host}/main`,
                changefreq: "weekly"
            });

            // 构建 Sitemap XML 内容
            const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
            const urlsetStart = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
            const urlsetEnd = `</urlset>`;

            // 生成每个 URL 的 XML 节点
            let url = "";
            pages.forEach(page => {
                url += `
    <url>
        <loc>${page.url}</loc>
        ${page.lastmod? `<lastmod>${page.lastmod}</lastmod>` : ""}
        ${page.changefreq? `<changefreq>${page.changefreq}</changefreq>` : ""}
    </url>`;
            });

            // 完整的 XML 内容
            const sitemapXml = `${xmlHeader}\n${urlsetStart}${url}\n${urlsetEnd}`;

            // 设置响应头并返回 XML 内容
            res.type("application/xml");
            res.send(sitemapXml);
        });
    }
}
