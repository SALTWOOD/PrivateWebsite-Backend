import { Table } from './IDatabase.js';
import { UserEntity } from './UserEntity.js';

@Table('github_users', `
    id INTEGER PRIMARY KEY,
    login TEXT,
    avatar_url TEXT
`, `
    id INT,
    login VARCHAR(64),
    avatar_url VARCHAR(255),
    PRIMARY KEY (id)
`)
export class GitHubUser {
    id: number;
    login: string;
    avatar_url: string;

    public constructor() {
        this.id = 0;
        this.login = '';
        this.avatar_url = '';
    }

    public static create(id: number, login: string, avatar_url: string): GitHubUser {
        const user = new GitHubUser();
        user.id = id;
        user.login = login;
        user.avatar_url = avatar_url;
        return user;
    }

    public toUserEntity(): UserEntity {
        const user = new UserEntity();
        user.id = this.id;
        user.username = this.login;
        user.photo = this.avatar_url;
        user.permission = 0;
        return user;
    }

    public toUserWithDbEntity(u: UserEntity): UserEntity {
        const user = new UserEntity();
        user.id = this.id;
        user.username = this.login;
        user.photo = this.avatar_url;
        user.permission = Number(u.permission);
        return user;
    }
}
