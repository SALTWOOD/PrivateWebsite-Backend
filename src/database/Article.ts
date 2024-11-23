import { PrimaryKey, Table } from "./SQLiteHelper.js";

@PrimaryKey("id")
@Table("articles", `
    author INTEGER,
    content TEXT,
    description TEXT,
    published BOOLEAN,
    publishedAt INTEGER,
    title TEXT,
    id INTEGER INDEX,
    background TEXT,
    hash TEXT
`)
export class Article {
    public author: number = 0;
    public content: string = "";
    public description: string = "";
    public published: number = 0;
    public publishedAt: number = Date.now();
    public title: string = "";
    public id: number = 0;
    public background: string = "";
    public hash: string = "";

    public getJson(contentHidden: boolean = false): any {
        const toBoolean = ({ published, ...rest }: any) => ({
            published: published !== 0,
            ...rest
        });
        const hideContent = ({ content, ...rest }: any) => (rest);
        let content = toBoolean(this);
        if (contentHidden) content = hideContent(content);
        return content;
    }
}
