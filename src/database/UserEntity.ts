import { PrimaryKey, Table } from './IDatabase.js';

// TypeScript 等效的 UserEntity 类
@Table('users', `
    id INT AUTO_INCREMENT,
    username VARCHAR(32) NOT NULL,
    photo VARCHAR(128),
    permission INT DEFAULT 0,
    PRIMARY KEY (id)
`)
@PrimaryKey('id')
export class UserEntity {
    public id: number;
    public username: string;
    public photo: string;
    public permission: number = 0;

    constructor(id: number = 0, username: string = '', photo: string = '') {
        this.id = id;
        this.username = username;
        this.photo = photo;
    }
}