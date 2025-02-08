import { AutoIncrement, PrimaryKey, Table } from "./IDatabase.js";

@Table("friend_links", `
    id INT AUTO_INCREMENT,
    name VARCHAR(24),
    description VARCHAR(128),
    url VARCHAR(256),
    avatar VARCHAR(256),
    lastAvailable DATETIME DEFAULT CURRENT_TIMESTAMP,
    available BOOLEAN,
    PRIMARY KEY (id)
`)
@AutoIncrement("id")
@PrimaryKey("id")
export class FriendLink {
    public id: number = 0;
    public name: string = "";
    public description: string = "";
    public url: string = "";
    public avatar: string = "";
    public lastAvailable: Date = new Date();
    public available: boolean = true;

    public concat(friend: FriendLink): void {
        this.name = friend.name;
        this.description = friend.description;
        this.url = friend.url
        this.avatar = friend.avatar;
    }
}