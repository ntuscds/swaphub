declare module "jsonwebtoken" {
  export type JwtPayload = {
    [key: string]: unknown;
    sub?: string;
    iat?: number;
    exp?: number;
    aud?: string | string[];
    iss?: string;
  };

  export function sign(
    payload: string | Buffer | object,
    secretOrPrivateKey: string | Buffer,
    options?: {
      algorithm?: "HS256" | "RS256";
      expiresIn?: number | string;
      issuer?: string;
      audience?: string | string[];
      subject?: string;
      keyid?: string;
    }
  ): string;

  export function verify(
    token: string,
    secretOrPublicKey: string | Buffer,
    options?: {
      algorithms?: Array<"HS256" | "RS256">;
      ignoreExpiration?: boolean;
    }
  ): JwtPayload | string;
}
