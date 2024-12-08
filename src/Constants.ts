export class Constants {
    public static readonly TOKEN_NAME = "pw-token";
}

export interface IUserJwt {
    userId: string;
    clientId: string;
    aud: string;
    exp: number;
    iat: number;
    iss: string;
}