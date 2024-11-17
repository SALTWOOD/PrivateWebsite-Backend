import { PrimaryKey, Table } from "./SQLiteHelper.js";

@PrimaryKey("id")
@Table("articles", `
    author INTEGER,
    content TEXT,
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
    public published: number = 0;
    public publishedAt: number = Date.now();
    public title: string = "";
    public id: number = 0;
    public background: string = "";
    public hash: string = "";
}
