import * as mysql from 'mysql2/promise';
import { mysqlPrimaryKeyMap, mysqlTableNameMap, mysqlTableSchemaMap, IDatabase } from './IDatabase.js';

export class MySqlHelper implements IDatabase {
    // @ts-ignore
    private mysqlConnection: mysql.Connection;

    constructor(
        private mysqlHost: string = 'localhost',
        private mysqlPort: number = 3306,
        private mysqlUser: string = 'root',
        private mysqlPassword: string = 'rootpassword',
        private mysqlDatabase: string = 'private_website_db'
    ) { }

    // 初始化 MySQL 连接
    public async init(): Promise<void> {
        this.mysqlConnection = await mysql.createConnection({
            host: this.mysqlHost,
            port: this.mysqlPort,
            user: this.mysqlUser,
            password: this.mysqlPassword,
            database: this.mysqlDatabase
        });
        console.log("MySQL connected");
    }

    // 创建或更新表（MySQL）
    public async createTable<T extends object>(type: { new(): T }): Promise<void> {
        const tableName = this.getTableNameByConstructor(type);
        const schema = mysqlTableSchemaMap.get(type);

        if (!schema) {
            throw new Error(`Schema for table ${tableName} not defined`);
        }

        // 检查表是否已经存在
        const [rows] = await this.mysqlConnection.query(`SHOW TABLES LIKE ?`, [tableName]);
        if ((rows as any[]).length > 0) {
            // 表存在，检查并添加缺少的列（MySQL暂不支持直接删除列，通常需要创建新表）
            await this.updateTableStructure(tableName, schema);
        } else {
            // 表不存在，直接创建
            const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
            await this.mysqlConnection.query(createTableSQL);
        }
    }

    // 检查并添加缺失的列
    private async updateTableStructure(tableName: string, schema: string): Promise<void> {
        // 获取现有表的列信息
        const [existingColumns] = await this.mysqlConnection.query(`DESCRIBE ${tableName}`);

        // 从 schema 中提取列名
        const newColumns = schema
            .split(',')
            .map(col => col.trim().split(' ')[0])
            // 判断是否全是大写字母，如果是，则过滤掉
            .filter(col => !/^[A-Z_]+$/.test(col));

        // 找出多余的列（MySQL暂不支持直接删除列，通常需要创建新表）
        const columnsToAdd = newColumns.filter(columnName => !(existingColumns as any[]).some((col) => col.Field === columnName));

        // 如果有缺失的列，使用 ALTER TABLE 添加
        if (columnsToAdd.length > 0) {
            for (const column of columnsToAdd) {
                const columnDefinition = schema
                    .split(',')
                    .map(col => col.trim())
                    .find(col => col.startsWith(column));

                if (columnDefinition) {
                    const alterTableSQL = `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`;
                    await this.mysqlConnection.query(alterTableSQL);
                    console.log(`Added column ${column} to table ${tableName}`);
                }
            }
        } else {
            console.log(`No new columns to add for table ${tableName}`);
        }
    }

    // 插入数据（MySQL）
    public async insert<T extends object>(obj: T): Promise<void> {
        const tableName = this.getTableName(obj);
        const data = obj as Record<string, any>;
        const ignoredFields = (obj.constructor as any).ignoredFields || [];
        const kvp = Object.keys(data).filter(key => !ignoredFields.includes(key));

        const columns = kvp.join(', ');
        const placeholders = kvp.map(() => '?').join(', ');
        const values = kvp.map(key => data[key]);

        const insertSQL = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        await this.mysqlConnection.query(insertSQL, values);
    }

    // 查询数据（MySQL）
    public async select<T extends object>(type: { new(): T }, columns: string[], whereClause?: string, params?: any[]): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const selectSQL = `SELECT ${columns.join(', ')} FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''}`;
        const [rows] = await this.mysqlConnection.query(selectSQL, params);

        return rows as T[];
    }

    // 从 MySQL 获取单个实体
    public async getEntity<T extends object>(type: { new(): T }, primaryKey: number | string): Promise<T | null> {
        const tableName = this.getTableNameByConstructor(type);
        const pk = mysqlPrimaryKeyMap.get(type.constructor as { new(): T }) || 'id';
        const selectSQL = `SELECT * FROM ${tableName} WHERE ${pk} = ?`;
        const [_, rows] = await this.mysqlConnection.query(selectSQL, [primaryKey]);

        if (rows.length > 0) {
            const entity = new type();
            Object.assign(entity, rows[0]);
            return entity;
        }

        return null;
    }

    // 从 MySQL 获取所有实体
    public async getEntities<T extends object>(type: { new(): T }): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const selectSQL = `SELECT * FROM ${tableName}`;
        const [_, rows] = await this.mysqlConnection.query(selectSQL);

        return rows.map((row: mysql.FieldPacket) => {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        });
    }

    // 更新数据（MySQL）
    public async update<T extends object>(obj: T): Promise<void> {
        const tableName = this.getTableName(obj);
        const data = obj as Record<string, any>;
        const ignoredFields = (obj.constructor as any).ignoredFields || [];

        const pk = mysqlPrimaryKeyMap.get(obj.constructor as { new(): T }) || 'id';
        if (!pk) {
            throw new Error(`Primary key for table ${tableName} not defined`);
        }
        const kvp = Object.keys(data).filter(key => key !== pk && !ignoredFields.includes(key));

        const columns = kvp.map(key => `${key} = ?`).join(', ');
        const values = kvp.map(key => data[key]);

        values.push(data[pk]);

        const updateSQL = `UPDATE ${tableName} SET ${columns} WHERE ${pk} = ?`;
        await this.mysqlConnection.query(updateSQL, values);
    }

    // 删除数据（MySQL）
    public async remove<T extends object>(type: { new(): T }, obj: T): Promise<void> {
        const data = obj as Record<string, any>;
        const tableName = this.getTableNameByConstructor(type);

        const pk = mysqlPrimaryKeyMap.get(obj.constructor as { new(): T }) || 'id';

        const deleteSQL = `DELETE FROM ${tableName} WHERE ${pk} = ?`;
        await this.mysqlConnection.query(deleteSQL, [data[pk]]);
    }

    private getTableName<T extends object>(obj: T): string {
        const constructor = (obj as Object).constructor;
        return this.getTableNameByConstructor(constructor as { new(): T });
    }

    // 根据类型推断表名
    private getTableNameByConstructor<T extends object>(type: { new(): T }): string {
        const instance = new type();
        const tableName = mysqlTableNameMap.get(instance.constructor as any);
        if (!tableName) {
            throw new Error(`Table name for type ${type.name} not defined`);
        }
        return tableName;
    }

    // 关闭 MySQL 连接
    public async close(): Promise<void> {
        await this.mysqlConnection.end();
    }
}
