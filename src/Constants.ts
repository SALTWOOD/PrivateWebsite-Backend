export class Constants {
    public static readonly TOKEN_NAME = "pw-token";
    public static readonly TOKEN_USER_AUDIENCE = "user";

    public static readonly SECONDS_IN_DAY = 60 * 60 * 24;
    public static readonly MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
}

export interface IUserJwt {
    userId: string;
    clientId: string;
    aud: string;
    exp: number;
    iat: number;
    iss: string;
}