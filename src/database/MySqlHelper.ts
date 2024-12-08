import * as mysql from 'mysql2/promise';
import { mysqlPrimaryKeyMap, mysqlTableNameMap, mysqlTableSchemaMap, IDatabase, mysqlAutoIncrementMap } from './IDatabase.js';

export class MySqlHelper implements IDatabase {
    // @ts-ignore
    private mysqlConnection: mysql.Connection;
    private reconnecting: boolean = false;

    constructor(
        private mysqlHost: string = 'localhost',
        private mysqlPort: number = 3306,
        private mysqlUser: string = 'root',
        private mysqlPassword: string = 'rootpassword',
        private mysqlDatabase: string = 'private_website_db',
        private maxRetries: number = 5,
        private retryDelay: number = 1000
    ) { }

    // 初始化 MySQL 连接
    private async connect(): Promise<void> {
        this.mysqlConnection = await mysql.createConnection({
            host: this.mysqlHost,
            port: this.mysqlPort,
            user: this.mysqlUser,
            password: this.mysqlPassword,
            database: this.mysqlDatabase,
            charset: 'utf8mb4'
        });

        console.log("MySQL connected");
        this.mysqlConnection.on('error', this.handleConnectionError.bind(this)); // 监听连接错误
    }

    // 尝试连接 MySQL
    public async init(): Promise<void> {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                await this.connect();
                break;
            } catch (err) {
                console.log(err);
                console.error(`MySQL connection failed, retrying... (${retries + 1}/${this.maxRetries})`);
                retries++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retries))); // Exponential backoff
            }
        }

        if (retries >= this.maxRetries) {
            throw new Error('Failed to connect to MySQL after multiple attempts');
        }
    }

    // 连接错误处理（如连接断开）
    private async handleConnectionError(error: any): Promise<void> {
        console.error('MySQL connection error:', error.message);

        if (this.reconnecting) return; // 如果正在重连，则不再进行重复的重连操作

        // 如果是连接丢失错误，进行重连
        if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNREFUSED') {
            this.reconnecting = true;
            console.log('Attempting to reconnect to MySQL...');
            await this.reconnect();
        } else {
            throw error; // 如果是其他错误，直接抛出
        }
    }

    // 重连逻辑
    private async reconnect(): Promise<void> {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                await this.connect();
                this.reconnecting = false;
                console.log('Reconnected to MySQL successfully.');
                break;
            } catch (err) {
                console.error(`Reconnection failed, retrying... (${retries + 1}/${this.maxRetries})`);
                retries++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retries))); // Exponential backoff
            }
        }

        if (retries >= this.maxRetries) {
            throw new Error('Failed to reconnect to MySQL after multiple attempts.');
        }
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
            // 表存在，检查并更新列类型和缺少的列
            await this.updateTableStructure(tableName, schema);
        } else {
            // 表不存在，直接创建
            const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`;
            await this.mysqlConnection.query(createTableSQL);
        }
    }

    // 检查并更新表结构
    private async updateTableStructure(tableName: string, schema: string): Promise<void> {
        // 获取现有表的列信息
        const [existingColumns] = await this.mysqlConnection.query(`DESCRIBE ${tableName}`) as any[];

        // 解析当前表结构和 schema，检查列是否变化
        const newColumns = schema.split(',').map(col => col.trim()).filter(col => !/^[A-Z_]+$/.test(col.split(' ').at(0) || ''));
        const columnsToAdd: string[] = [];
        const columnsToModify: { columnName: string, newDefinition: string }[] = [];

        // 比较现有表列与新列，找出差异
        for (const newColumn of newColumns) {
            const columnName = newColumn.split(' ')[0]; // 获取列名
            const existingColumn = (existingColumns as any[]).find(col => col.Field === columnName);

            if (!existingColumn) {
                columnsToAdd.push(newColumn); // 如果列不存在，添加列
            } else {
                // 比较列类型，必要时修改列类型
                const currentColumnDefinition = existingColumn.Type.trim();
                const newColumnDefinition = newColumn.split(' ').slice(1).join(' ').trim();

                if (currentColumnDefinition !== newColumnDefinition) {
                    columnsToModify.push({ columnName, newDefinition: newColumn });
                }
            }
        }

        // 添加缺少的列
        if (columnsToAdd.length > 0) {
            for (const column of columnsToAdd) {
                const alterTableSQL = `ALTER TABLE ${tableName} ADD COLUMN ${column}`;
                await this.mysqlConnection.query(alterTableSQL);
                console.log(`Added column ${column} to table ${tableName}`);
            }
        }

        // 修改列的定义（如果列类型发生变化）
        if (columnsToModify.length > 0) {
            for (const { columnName, newDefinition } of columnsToModify) {
                const alterColumnSQL = `ALTER TABLE ${tableName} MODIFY COLUMN ${newDefinition}`;
                await this.mysqlConnection.query(alterColumnSQL);
                console.log(`Modified column ${columnName} to ${newDefinition} in table ${tableName}`);
            }
        }

        if (columnsToAdd.length === 0 && columnsToModify.length === 0) {
            console.log(`No changes needed for table ${tableName}`);
        }
    }

    // 插入数据（MySQL）
    public async insert<T extends object>(type: { new(): T }, obj: T): Promise<number> {
        const tableName = this.getTableName(type);
        const data = obj as Record<string, any>;
        const ignoredFields = (obj.constructor as any).ignoredFields || [];
        const autoIncrementKey = mysqlAutoIncrementMap.get(obj.constructor) || "";
        const kvp = Object.keys(data).filter(key => !ignoredFields.includes(key) && key !== autoIncrementKey);

        const columns = kvp.join(', ');
        const placeholders = kvp.map(() => '?').join(', ');
        const values = kvp.map(key => data[key]);

        const insertSQL = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        return ((await this.mysqlConnection.query(insertSQL, values))[0] as { insertId: number }).insertId;
    }

    // 查询数据（MySQL）
    public async select<T extends object>(type: { new(): T }, columns: string[], whereClause?: string, params?: any[], variable?: string): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const selectSQL = `SELECT ${columns.join(', ')} FROM ${tableName}${variable ? ` ${variable}` : ''}${whereClause ? ` WHERE ${whereClause}` : ''}`;
        const rows = ((await this.mysqlConnection.query(selectSQL, params))[0] as any[]).map((row: any) => {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        });
        
        return rows as T[];
    }

    // 从 MySQL 获取单个实体
    public async getEntity<T extends object>(type: { new(): T }, primaryKey: number | string): Promise<T | null> {
        const tableName = this.getTableNameByConstructor(type);
        const pk = mysqlPrimaryKeyMap.get(type.constructor as { new(): T }) || 'id';
        const selectSQL = `SELECT * FROM ${tableName} WHERE ${pk} = ?`;
        const rows = (await this.mysqlConnection.query(selectSQL, [primaryKey]))[0] as T[];

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
        const [rows] = await this.mysqlConnection.query(selectSQL);

        return (rows as T[]).map((row: T) => {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        });
    }

    // 更新数据（MySQL）
    public async update<T extends object>(type: { new(): T }, obj: T): Promise<void> {
        const tableName = this.getTableName(type);
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

    public async count<T extends object>(type: { new(): T }, whereClause?: string, params?: any[], variable?: string): Promise<number> {
        const tableName = this.getTableNameByConstructor(type);
        const countSQL = `SELECT COUNT(*) FROM ${tableName}${variable ? ` ${variable}` : ''}${whereClause ? ` WHERE ${whereClause}` : ''}`;
        const [rows] = await this.mysqlConnection.query(countSQL, params);
        return (rows as any[])[0]['COUNT(*)'] || 0;
    }

    // 删除数据（MySQL）
    public async remove<T extends object>(type: { new(): T }, obj: T): Promise<void> {
        const data = obj as Record<string, any>;
        const tableName = this.getTableNameByConstructor(type);

        const pk = mysqlPrimaryKeyMap.get(obj.constructor as { new(): T }) || 'id';

        const deleteSQL = `DELETE FROM ${tableName} WHERE ${pk} = ?`;
        await this.mysqlConnection.query(deleteSQL, [data[pk]]);
    }

    // 关闭 MySQL 连接
    public async close(): Promise<void> {
        await this.mysqlConnection.end();
    }

    private getTableName<T extends object>(type: { new(): T }): string {
        const constructor = (new type() as Object).constructor;
        return this.getTableNameByConstructor<T>(constructor as { new(): T });
    }

    // 根据类型推断表名
    private getTableNameByConstructor<T extends object>(constructor: { new(): T }): string {
        const tableName = mysqlTableNameMap.get(constructor);
        if (!tableName) {
            throw new Error(`Table name for type ${constructor.name} not defined: ${tableName}`);
        }
        return tableName;
    }

    public async run(sql: string, params?: any[]): Promise<any> {
        return (await this.mysqlConnection.query(sql, params))[0];
    }

    public async query<T extends object>(type: { new (): T; }, sql: string, params?: any[]): Promise<T[]> {
        const tableName = this.getTableNameByConstructor(type);
        const [rows] = await this.mysqlConnection.query(sql, params);
        return (rows as T[]).map((row: T) => {
            const entity = new type();
            Object.assign(entity, row);
            return entity;
        });
    }
}
