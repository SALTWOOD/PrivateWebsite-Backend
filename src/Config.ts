import fs from 'fs';

export class Config {
    private static _instance: Config;

    public static version = "1.0.0";

    // 定义配置字段
    public site_information: { title: string, bio: string } = { title: '', bio: '' };
    public github: { id: string; secret: string, url: { normal: string, api: string } } = { id: '', secret: '', url: { normal: 'github.com', api: 'api.github.com' } };
    public network: { host: string, port: number } = { host: '127.0.0.1', port: 2500 };
    public user: { tokenExpiration: number } = { tokenExpiration: 30 };
    public rss: { description: string, url: string } = { description: '', url: 'https://example.com' };
    public database: { host: string, port: number, username: string, password: string, database: string } = {
        host: "localhost",
        port: 3306,
        username: "mysql",
        password: "mysql",
        database: "private_website_db"
    }
    public site: {
        friends: {
            name: string,
            url: string,
            avatar: string,
            description: string
        }[]
    } = { friends: [] };

    private constructor() {
        // 读取并解析 json 文件
        const data = fs.readFileSync('./data/config.json', 'utf-8');
        const configData = JSON.parse(data);

        // 自动映射配置数据到实例字段
        Object.keys(configData).forEach((key) => {
            if (key in this) {
                this.validateAndAssign(key as keyof Config, configData[key]);
            }
        });
    }

    private validateAndAssign(field: keyof Config, value: any): void {
        const fieldType = typeof this[field];  // 通过 keyof Config 确保访问的是 Config 类中的字段

        // 类型匹配检查
        if (fieldType === 'string' && typeof value !== 'string') {
            throw new Error(`Invalid type for field "${field}". Expected string but got ${typeof value}.`);
        }
        if (fieldType === 'number' && typeof value !== 'number') {
            throw new Error(`Invalid type for field "${field}". Expected number but got ${typeof value}.`);
        }
        if (fieldType === 'boolean' && typeof value !== 'boolean') {
            throw new Error(`Invalid type for field "${field}". Expected boolean but got ${typeof value}.`);
        }
        if (fieldType === 'object' && typeof value === 'object' && value !== null) {
            const expectedObjectType = this[field] as unknown as object;
            if (Array.isArray(value)) {
                throw new Error(`Invalid type for field "${field}". Expected object but got array.`);
            }
            Object.keys(expectedObjectType).forEach(subKey => {
                if (!(subKey in value)) {
                    // 补充缺少的字段
                    (value as any)[subKey] = (expectedObjectType as any)[subKey];
                }
            });
        }

        // 最终赋值
        (this as any)[field] = value;
    }

    public static getInstance(): Config {
        if (!Config._instance) {
            Config._instance = new Config();
        }
        return Config._instance;
    }

    public static get instance(): Config {
        return Config.getInstance();
    }
}
