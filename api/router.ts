import { Router } from "express";
import { DbService } from "../db/db-service.js";
import { AccessTokenService } from "../jwt/jwt-service.js";
import { Settings } from "../settings.js";
import { authMiddleware } from "./auth/auth-middleware.js";
import { authRouter } from "./auth/router.js";
import { filesRouter } from "./files/router.js";
import { pagesRouter } from "./pages/router.js";
import { usersRouter } from "./users/router.js";

export const apiRouter = (
  settings: Settings,
  dbService: DbService,
  jwtService: AccessTokenService
): Router => {
  const checkAuth = authMiddleware(jwtService);
  return Router()
    .use("/auth", authRouter(dbService, jwtService))
    .use("/pages", checkAuth, pagesRouter(settings, dbService))
    .use("/files", checkAuth, filesRouter(settings))
    .use("/users", checkAuth, usersRouter(dbService))
    .use("/db", checkAuth, (_, res) => {
      res.status(501).json({ error: "Not implemented" });
    });
};
