// 表的定义映射
export const tableSchemaMap = new Map<Function, string>();
export const tableNameMap = new Map<Function, string>();
export const primaryKeyMap = new Map<Function, string>();

// 装饰器用于指定表名和表结构
function Table(tableName: string, schema: string) {
    return function (constructor: Function) {
        tableSchemaMap.set(constructor, schema);
        tableNameMap.set(constructor, tableName);
    };
}


function PrimaryKey(primaryKey: string) {
    return function (constructor: Function) {
        primaryKeyMap.set(constructor, primaryKey);
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

export { Table, Ignore, PrimaryKey };

export interface IDatabase {
    createTable<T extends object>(type: { new (): T }): Promise<void>;
    insert<T extends object>(obj: T): Promise<void>;
    select<T extends object>(type: { new (): T }, columns: string[], whereClause?: string, params?: any[]): Promise<T[]>;
    getEntity<T extends object>(type: { new (): T }, primaryKey: number | string): Promise<T | null>;
    getEntities<T extends object>(type: { new (): T }): Promise<T[]>;
    update<T extends object>(obj: T): Promise<void>;
    remove<T extends object>(type: { new (): T }, obj: T): Promise<void>;
    close(): Promise<void>;
}
