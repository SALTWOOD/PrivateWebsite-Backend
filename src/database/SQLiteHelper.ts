import Database from 'better-sqlite3';
import { tableSchemaMap, tableNameMap, primaryKeyMap, IDatabase } from './IDatabase.js';

export class SQLiteHelper implements IDatabase {
    private db: Database.Database;

    public get database(): Database.Database {
        return this.db;
    }

    constructor(private dbFilePath: string) {
        // 打开数据库连接
        this.db = new Database(dbFilePath, { verbose: console.log });
    }

    // 创建或更新表
    public async createTable<T extends object>(type: { new (): T }): Promise<void> {
        const tableName = this.getTableNameByConstructor(type);
        const schema = tableSchemaMap.get(type);

        if (!schema) {
            throw new Error(`Schema for table ${tableName} not defined`);
        }

        // 检查表是否已经存在
        const tableExists = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);

        if (tableExists) {
            // 表存在，检查并添加缺少的列或删除多余的列
            await this.updateTableStructure(tableName, schema);
        } else {
            // 表不存在，直接创建
            const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
            this.db.exec(createTableSQL);
        }
    }

    // 检查并添加缺失的列以及删除多余的列
    private async updateTableStructure(tableName: string, schema: string): Promise<void> {
        // 获取现有表的列信息
        const existingColumns = this.getExistingColumns(tableName);

        // 从 schema 中提取列名
        const newColumns = schema
            .split(',')
            .map(col => col.trim().split(' ')[0]); // 获取列名

        // 找出多余的列
        const columnsToRemove = existingColumns.filter(column => !newColumns.includes(column));

        // 如果有多余的列，使用 ALTER TABLE 删除
        for (const column of columnsToRemove) {
            const alterTableSQL = `ALTER TABLE ${tableName} DROP COLUMN ${column}`;
            this.db.exec(alterTableSQL);
            console.log(`Dropped column ${column} from table ${tableName}`);
        }

        // 检查并添加缺失的列
        const columnsToAdd = newColumns.filter(columnName => !existingColumns.includes(columnName));

        // 如果有缺失的列，使用 ALTER TABLE 添加
        if (columnsToAdd.length > 0) {
            for (const column of columnsToAdd) {
                const columnDefinition = schema
                    .split(',')
                    .map(col => col.trim())
                    .find(col => col.startsWith(column));

                if (columnDefinition) {
                    const alterTableSQL = `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`;
                    this.db.exec(alterTableSQL);
                    console.log(`Added column ${column} to table ${tableName}`);
                }
            }
        } else {
            console.log(`No new columns to add for table ${tableName}`);
        }
    }

    // 获取现有的列信息
    private getExistingColumns(tableName: string): string[] {
        const result = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        return result.map((row: any) => row.name);
    }

    // 插入数据
    public async insert<T extends object>(obj: T): Promise<void> {
        const tableName = this.getTableName(obj);
        const data = obj as Record<string, any>;
        const ignoredFields = (obj.constructor as any).ignoredFields || [];
        const kvp = Object.keys(data).filter(key => !ignoredFields.includes(key));

        const columns = kvp.join(', ');
        const placeholders = kvp.map(() => '?').join(', ');
        const values = kvp.map(key => data[key]);

        const insertSQL = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        const stmt = this.db.prepare(insertSQL);
        stmt.run(...values);
    }

    // 查询数据
    public async select<T extends object>(type: { new (): T }, columns: string[], whereClause?: string, params?: any[]): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const selectSQL = `SELECT ${columns.join(', ')} FROM ${tableName} ${whereClause ? `WHERE ${whereClause}` : ''}`;
        const stmt = this.db.prepare(selectSQL);
        return stmt.all(params) as T[];
    }

    public async getEntity<T extends object>(type: { new (): T }, primaryKey: number | string): Promise<T | null> {
        const tableName = this.getTableNameByConstructor(type);
        const pk = primaryKeyMap.get(type.constructor as { new (): T }) || 'id';
        const selectSQL = `SELECT * FROM ${tableName} WHERE ${pk} = ?`;
        const stmt = this.db.prepare(selectSQL);
        const row = stmt.get(primaryKey);

        if (row) {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        }

        return null;
    }

    public async getEntities<T extends object>(type: { new (): T }): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const selectSQL = `SELECT * FROM ${tableName}`;
        const stmt = this.db.prepare(selectSQL);
        const rows = stmt.all() as T[];

        return rows.map((row: T) => {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        });
    }

    public async exists<T extends object>(obj: T): Promise<boolean> {
        const tableName = this.getTableName(obj);
        const data = obj as Record<string, any>;
        const pk = primaryKeyMap.get(obj.constructor as { new (): T }) || 'id';

        const selectSQL = `SELECT 1 FROM ${tableName} WHERE ${pk} = ?`;
        const stmt = this.db.prepare(selectSQL);
        const row = stmt.get(data[pk]);

        return row !== undefined;
    }

    public async update<T extends object>(obj: T): Promise<void> {
        const tableName = this.getTableName(obj);
        const data = obj as Record<string, any>;
        const ignoredFields = (obj.constructor as any).ignoredFields || [];

        const pk = primaryKeyMap.get(obj.constructor as { new (): T }) || 'id';
        if (!pk) {
            throw new Error(`Primary key for table ${tableName} not defined`);
        }
        const kvp = Object.keys(data).filter(key => key !== pk && !ignoredFields.includes(key));

        // Construct the update columns, ignoring fields marked with @ignore
        const columns = kvp.map(key => `${key} = ?`).join(', ');

        const values = kvp.map(key => data[key]);

        // Ensure `id` is at the end of the values array
        values.push(data[pk]);

        const updateSQL = `UPDATE ${tableName} SET ${columns} WHERE ${pk} = ?`;
        const stmt = this.db.prepare(updateSQL);
        stmt.run(...values);
    }

    public async remove<T extends object>(type: { new (): T }, obj: T): Promise<void> {
        const data = obj as Record<string, any>;
        const tableName = this.getTableNameByConstructor(type);

        const pk = primaryKeyMap.get(obj.constructor as { new (): T }) || 'id';

        const deleteSQL = `DELETE FROM ${tableName} WHERE ${pk} = ?`;
        const stmt = this.db.prepare(deleteSQL);
        stmt.run(data[pk]);
    }

    private getTableName<T extends object>(obj: T): string {
        const constructor = (obj as Object).constructor;
        return this.getTableNameByConstructor(constructor as { new (): T });
    }

    // 根据类型推断表名
    private getTableNameByConstructor<T extends object>(type: { new (): T }): string {
        const instance = new type();
        const tableName = tableNameMap.get(instance.constructor as any);
        if (!tableName) {
            throw new Error(`Table name for type ${type.name} not defined`);
        }
        return tableName;
    }

    // 关闭数据库连接
    public async close(): Promise<void> {
        this.db.close();
    }
}
