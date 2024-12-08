import { Config } from "../Config.js";
import { Constants } from "../Constants.js";
import { GitHubUser } from "../database/GitHubUser.js";
import { UserEntity } from "../database/UserEntity.js";
import JwtHelper from "../JwtHelper.js";
import { Utilities } from "../Utilities.js";
import { RouteFactory } from "./RouteFactory.js";
import { NextFunction, Request, Response } from "express";

export class RouteAuth {
    public static register(inst: RouteFactory) {
        inst.app.get("/api/auth/id", (req: Request, res: Response) => {
            res.end(Config.instance.github.id);
        });
        inst.app.post("/api/auth/login", async (req: Request, res: Response) => {
            res.set("Content-Type", "application/json");
        
            try {
                const code = req.query.code as string || '';
        
                // 请求GitHub获取access_token
                const tokenData = await inst.got.post(`https://${Config.instance.github.url.normal}/login/oauth/access_token`, {
                    form: {
                        code,
                        client_id: Config.instance.github.id,
                        client_secret: Config.instance.github.secret
                    },
                    headers: {
                        'Accept': 'application/json'
                    },
                    responseType: 'json'
                }).json<{ access_token: string }>();
        
                const accessToken = tokenData.access_token;
        
                let userResponse = await inst.got(`https://${Config.instance.github.url.api}/user`, {
                    headers: {
                        'Authorization': `token ${accessToken}`,
                        'Accept': 'application/json',
                        'User-Agent': 'Open93AtHome-V3/3.0.0' // GitHub API要求设置User-Agent
                    }
                }).json<{ id: number, login: string, avatar_url: string, name: string }>();
             
                const githubUser = GitHubUser.create(
                    userResponse.id,
                    userResponse.name || userResponse.login || '',
                    userResponse.avatar_url
                );
        
                // 处理数据库操作
                let dbUser = await inst.db.getEntity<UserEntity>(UserEntity, githubUser.id);
                if (dbUser) {
                    await inst.db.update<UserEntity>(UserEntity, await githubUser.toUserWithDbEntity(dbUser));
                } else {
                    await inst.db.insert<UserEntity>(UserEntity, githubUser.toUserEntity());
                }
        
                // 生成JWT并设置cookie
                const token = JwtHelper.instance.issueToken({
                    userId: githubUser.id,
                    clientId: Config.instance.github.id
                }, Constants.TOKEN_USER_AUDIENCE, Constants.SECONDS_IN_DAY * Config.instance.user.tokenExpiration);
        
                res.cookie('pw-token', token, {
                    expires: Utilities.getDate(Config.instance.user.tokenExpiration, "day"),
                    secure: true,
                    sameSite: 'lax',
                });

                const user = await inst.db.getEntity<UserEntity>(UserEntity, githubUser.id);

                res.status(200).json(user);
            } catch (error) {
                const err = error as Error;
                console.error('Error processing GitHub OAuth:', err);
                res.status(500).json({
                    error: `${err.name}: ${err.message}`
                });
            }
        });
    }
}
