import dotenv from 'dotenv';
import env from 'env-var';

export class Config {
    public static instance: Config

    public readonly githubOAuthClientId: string = env.get('GITHUB_OAUTH_CLIENT_ID').default("").asString();
    public readonly githubOAuthClientSecret: string = env.get('GITHUB_OAUTH_CLIENT_SECRET').default("").asString();
    public readonly githubOAuthCallbackUrl: string = env.get('GITHUB_OAUTH_CALLBACK_URL').default("").asString();
    public readonly githubUrl: string = env.get('GITHUB_URL').default("github.com").asString();
    public readonly githubApiUrl: string = env.get('GITHUB_API_URL').default("api.github.com").asString();

    // 开发变量
    public readonly debug: boolean = env.get('DEBUG').default("false").asBool();
    public readonly disableAccessLog: boolean = env.get('DISABLE_ACCESS_LOG').default("false").asBool();

    public static readonly version: string = "1.0.0";

    private constructor() { }

    public static getInstance(): Config {
        if (!Config.instance) {
            Config.init();
        }
        return Config.instance;
    }

    public get instance(): Config {
        return Config.instance;
    }

    public static init() {
        if (!Config.instance) {
            Config.instance = new Config();
        }
    }
}

dotenv.config()