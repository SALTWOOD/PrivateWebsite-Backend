import { Config } from "../Config.js";
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
             
                const user = GitHubUser.create(
                    userResponse.id,
                    userResponse.name || userResponse.login || '',
                    userResponse.avatar_url
                );
        
                // 处理数据库操作
                let dbUser = inst.db.getEntity<UserEntity>(UserEntity, user.id);
                if (dbUser) {
                    inst.db.update(user.toUserWithDbEntity(dbUser));
                } else {
                    inst.db.insert<UserEntity>(user.toUserEntity());
                }
        
                // 生成JWT并设置cookie
                const token = JwtHelper.instance.issueToken({
                    userId: user.id,
                    clientId: Config.instance.github.id
                }, "user", 60 * 60 * 24);
        
                res.cookie('token', token, {
                    expires: Utilities.getDate(1, "day"),
                    secure: true,
                    sameSite: 'lax',
                });

                if (inst.db.getEntity<UserEntity>(UserEntity, user.id)?.permission) {
                    const adminToken = JwtHelper.instance.issueToken({
                        userId: user.id,
                        clientId: Config.instance.github.id
                    }, "admin", 60 * 60 * 24);
                    res.cookie('adminToken', adminToken, {
                        expires: Utilities.getDate(1, "day"),
                        secure: true,
                        sameSite: 'lax',
                    });
                }
        
                res.status(200).json({
                    avatar_url: user.avatar_url,
                    username: user.login,
                    id: user.id
                });
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