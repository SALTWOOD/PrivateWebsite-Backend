import { PrimaryKey, Table } from "./IDatabase.js";

@PrimaryKey("id")
@Table("articles", `
    author INTEGER,
    content TEXT,
    description TEXT,
    published INTEGER,
    publishedAt INTEGER,
    title TEXT,
    id INTEGER,
    background TEXT,
    hash TEXT
`, `
    id INT,
    author INT,
    content TEXT,
    description VARCHAR(256),
    published INT,
    publishedAt BIGINT,
    title VARCHAR(32),
    background TEXT,
    hash CHAR(64),
    PRIMARY KEY (id)
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
