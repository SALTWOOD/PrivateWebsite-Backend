import { Article } from "./Article.js";
import { AutoIncrement, Ignore, PrimaryKey, Table } from "./IDatabase.js";
import { UserEntity } from "./UserEntity.js";
import { createHash } from "crypto";

@Table("comments", `
    id INT AUTO_INCREMENT,
    user INT,
    content VARCHAR(512),
    parent INT NULL,
    article INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    hash CHAR(40),
    FOREIGN KEY (parent_id) REFERENCES comments(id),
    PRIMARY KEY (id)
`)
@AutoIncrement("id")
@PrimaryKey("id")
export class Comment {
    public id: number;
    public user: number;
    public content: string;
    public parent: number | null;
    public article: number;
    public createdAt: Date;
    public hash: string;
    @Ignore()
    public replies: Comment[] = [];

    constructor() {
        this.id = 0;
        this.user = 0;
        this.content = "";
        this.parent = null;
        this.article = 0;
        this.createdAt = new Date();
        this.hash = "";
    }

    public static create(user: UserEntity, content: string, parent: number | null, article: Article) {
        const comment = new Comment();
        comment.user = user.id;
        comment.content = content;
        comment.parent = parent;
        comment.article = article.id;
        comment.hash = createHash("sha1").update(content).digest("hex");
        return comment;
    }

    public getJson(): any {
        const ignoreReplies = ({replies, ...rest} : any) => rest;
        return ignoreReplies(this);
    }
}