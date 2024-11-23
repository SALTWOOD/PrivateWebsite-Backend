import { Config } from "./Config.js";
import { Article } from "./database/Article.js";

export class RssFeed {
    private _data: string;
    private func: () => Article[];

    constructor(func: () => Article[]) {
        this._data = this.generate();
        this.func = func;
    }

    // 将时间戳转换为 RFC 822 格式日期
    private toRFC822Date(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toUTCString();
    }

    public get data(): string { return this.data; }

    // 生成 RSS 2.0 格式
    public generate(): string {
        const channelTitle = Config.instance.site_information.title;
        const channelLink = Config.instance.site.publicUrl;
        const channelDescription = Config.instance.rss.description;
        const articles = this.func();

        const items = articles.map((article) => {
            const pubDate = this.toRFC822Date(article.publishedAt);
            const link = `${Config.instance.rss.url}/main/article/${article.id}`;

            return `
                <item>
                    <title>${article.title}</title>
                    <link>${link}</link>
                    <description>${article.description}</description>
                    <pubDate>${pubDate}</pubDate>
                    <guid isPermaLink="false">${link}</guid>
                </item>`;
        }).join("\n");

        return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${channelTitle}</title>
    <link>${channelLink}</link>
    <description>${channelDescription}</description>
${items}
  </channel>
</rss>`;
    }

    public async notify(): Promise<void> {
        return new Promise(() => {
            this._data = this.generate();
        });
    }
}