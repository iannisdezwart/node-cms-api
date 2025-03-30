import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";
import jwt from "jsonwebtoken";

export type AccessTokenService = {
  signToken(username: string, level: string): string;
  verifyToken(token: string): { username: string; level: string } | null;
};

export const getAccessTokenService = (): AccessTokenService => {
  let secret: string;
  if (!existsSync(".jwtsecret")) {
    secret = randomBytes(64).toString("hex");
    writeFileSync(".jwtsecret", secret, "utf-8");
  } else {
    secret = readFileSync(".jwtsecret", "utf-8");
  }

  return {
    signToken(username: string, level: string) {
      return jwt.sign(
        {
          username,
          level,
          aud: "node-cms-admin-panel",
        },
        secret,
        {
          algorithm: "HS256",
          issuer: "node-cms",
          audience: "node-cms-admin-panel",
          expiresIn: "1d",
        }
      );
    },
    verifyToken(token: string) {
      try {
        const decoded = jwt.verify(token, secret, {
          algorithms: ["HS256"],
          issuer: "node-cms",
          audience: "node-cms-admin-panel",
        }) as { username: string; level: string };
        return decoded;
      } catch (err) {
        return null;
      }
    },
  };
};
