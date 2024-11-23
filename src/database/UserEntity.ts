import { PrimaryKey, Table } from './IDatabase.js';

// TypeScript 等效的 UserEntity 类
@Table('users', `
    id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, 
    username TEXT NOT NULL, 
    photo TEXT,
    permission INTEGER
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