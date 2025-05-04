import { RequestHandler } from "express";
import { AccessTokenService } from "../../jwt/jwt-service.js";

export const authMiddleware =
  (jwtService: AccessTokenService): RequestHandler =>
  (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (token === undefined) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const decoded = jwtService.verifyToken(token);
    if (decoded === null) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    req.params.user = decoded.username;
    next();
  };
