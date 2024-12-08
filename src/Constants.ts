import { Config } from "./Config.js";
import { Utilities } from "./Utilities.js";

export class Constants {
    public static readonly TOKEN_NAME = "pw-token";
    public static readonly TOKEN_USER_AUDIENCE = "user";

    public static readonly SECONDS_IN_DAY = 60 * 60 * 24;
    public static readonly MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

    public static GetBrowserCookieOptions(): {
        expires?: Date;
        secure?: boolean;
        sameSite?: 'lax' |'strict' | 'none';
    } {
        return {
            expires: Utilities.getDate(Config.instance.user.tokenExpiration, "day"),
            secure: true,
            sameSite: 'lax'
        };
    }
}

export interface IUserJwt {
    userId: string;
    clientId: string;
    aud: string;
    exp: number;
    iat: number;
    iss: string;
}