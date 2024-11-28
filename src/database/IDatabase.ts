// 表的定义映射
export const mysqlTableSchemaMap = new Map<Function, string>();
export const mysqlTableNameMap = new Map<Function, string>();
export const mysqlPrimaryKeyMap = new Map<Function, string>();
export const mysqlAutoIncrementMap = new Map<Function, string>();

// 装饰器用于指定表名和表结构
function Table(tableName: string, mysqlSchema: string) {
    return function (constructor: Function) {
        mysqlTableSchemaMap.set(constructor, mysqlSchema);
        mysqlTableNameMap.set(constructor, tableName);
    };
}


function PrimaryKey(primaryKey: string) {
    return function (constructor: Function) {
        mysqlPrimaryKeyMap.set(constructor, primaryKey);
    };
}


function AutoIncrement(key: string) {
    return function (constructor: Function) {
        mysqlAutoIncrementMap.set(constructor, key);
    };
}

function Ignore() {
    return function (target: any, propertyName: string) {
        const constructor = target.constructor;
        if (!constructor.ignoredFields) {
            constructor.ignoredFields = [];
        }
        constructor.ignoredFields.push(propertyName);
    };
}

export { Table, Ignore, AutoIncrement, PrimaryKey };

export interface IDatabase {
    createTable<T extends object>(type: { new (): T }): Promise<void>;
    insert<T extends object>(type: { new (): T }, obj: T): Promise<number>;
    select<T extends object>(type: { new (): T }, columns: string[], whereClause?: string, params?: any[]): Promise<T[]>;
    getEntity<T extends object>(type: { new (): T }, primaryKey: number | string): Promise<T | null>;
    getEntities<T extends object>(type: { new (): T }): Promise<T[]>;
    update<T extends object>(type: { new (): T }, obj: T): Promise<void>;
    remove<T extends object>(type: { new (): T }, obj: T): Promise<void>;
    close(): Promise<void>;
    count<T extends object>(type: { new (): T }, whereClause?: string, params?: any[]): Promise<number>;
    run(sql: string, params?: any[]): Promise<any>;
}
