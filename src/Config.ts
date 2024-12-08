import json5 from 'json5';
import fs from 'fs';

export class Config {
    public static FILENAME = './data/config.json5';
    private static _instance: Config;
    private static _fsWatcher: fs.FSWatcher;

    public static version = "1.0.0";

    // 定义配置字段
    public site_information: { title: string, bio: string } = { title: '', bio: '' };
    public github: { id: string; secret: string, url: { normal: string, api: string } } = { id: '', secret: '', url: { normal: 'github.com', api: 'api.github.com' } };
    public network: {
        host: string,
        port: number,
        trustProxy: boolean,
        remoteHost: string,
        remotePort: number
    } = {
            host: '127.0.0.1',
            port: 2500,
            trustProxy: false,
            remoteHost: '',
            remotePort: 2500
        };

    public user: { tokenExpiration: number } = { tokenExpiration: 30 };
    public rss: { description: string, url: string } = { description: '', url: 'https://example.com' };
    public database: { host: string, port: number, username: string, password: string, database: string, connectRetries: number } = {
        host: "localhost",
        port: 3306,
        username: "mysql",
        password: "mysql",
        database: "private_website_db",
        connectRetries: 30
    }
    public site: {
        friends: {
            name: string,
            url: string,
            avatar: string,
            description: string
        }[],
        backgrounds: string[]
    } = { friends: [], backgrounds: [] };

    public backgrounds: string[] = [];

    private constructor() {
        this.loadConfig();
    }

    private loadConfig(): void {
        // 读取并解析 json 文件
        if (!fs.existsSync(Config.FILENAME)) {
            const data = fs.readFileSync(Config.FILENAME, 'utf-8');
            const configData = json5.parse(data);
    
            // 自动映射配置数据到实例字段
            Object.keys(configData).forEach((key) => {
                if (key in this) {
                    this.validateAndAssign(key as keyof Config, configData[key]);
                }
            });
        }
        //否则就是用默认的配置

        // 加载背景图片
        const files = fs.readdirSync('./assets/backgrounds');
        // 根据文件名组合成 https(或http，从req获取)://{network.host}:{network.port}/assets/backgrounds/{filename} 的 URL
        this.backgrounds = files.map(file => `/assets/backgrounds/${file}`);
        this.backgrounds = [ ...this.backgrounds, ...this.site.backgrounds ];
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
            Config._fsWatcher = fs.watch(Config.FILENAME, () => {
                console.log('[Config] Config file changed. Reloading...');
                Config._instance.loadConfig();
            });  // 监听配置文件变化并重新加载
        }
        return Config._instance;
    }

    public static get instance(): Config {
        return Config.getInstance();
    }

    public static get fsWatcher(): fs.FSWatcher {
        return Config._fsWatcher;
    }
}
