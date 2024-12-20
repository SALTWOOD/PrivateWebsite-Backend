import { AutoIncrement, Index, PrimaryKey, Table } from "./IDatabase.js";

@PrimaryKey("id")
@Table("articles", `
    id INT AUTO_INCREMENT,
    author INT,
    content TEXT,
    description VARCHAR(128),
    published BOOLEAN,
    publishedAt BIGINT,
    lastUpdated BIGINT,
    title VARCHAR(24),
    background TEXT,
    hash CHAR(64),
    category TINYINT UNSIGNED DEFAULT 0,
    PRIMARY KEY (id)
`)
@Index("author", "author")
@Index("category", "category")
@AutoIncrement("id")
export class Article {
    public author: number = 0;
    public content: string = "";
    public description: string = "";
    public published: boolean = false;
    public publishedAt: number = Date.now();
    public lastUpdated: number = Date.now();
    public title: string = "";
    public id: number = 0;
    public background: string = "";
    public hash: string = "";
    public category: number = 0;

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
