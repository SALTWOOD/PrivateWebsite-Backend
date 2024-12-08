export class Constants {
    public static readonly TOKEN_NAME = "pw-token";
    public static readonly TOKEN_USER_AUDIENCE = "user";
}

export interface IUserJwt {
    userId: string;
    clientId: string;
    aud: string;
    exp: number;
    iat: number;
    iss: string;
}