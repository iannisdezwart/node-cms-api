import { Router } from "express";
import { DbService } from "../db/db-service";
import { AccessTokenService } from "../jwt/jwt-service";
import { authRouter } from "./auth/router";
import { authMiddleware } from "./auth/auth-middleware";
import { pagesRouter } from "./pages/router";
import { Settings } from "../settings";
import { filesRouter } from "./files/router";

export const apiRouter = (
  settings: Settings,
  dbService: DbService,
  jwtService: AccessTokenService
) => {
  const checkAuth = authMiddleware(jwtService);
  return Router()
    .use("/auth", authRouter(dbService, jwtService))
    .use("/pages", checkAuth, pagesRouter(settings, dbService))
    .use("/files", checkAuth, filesRouter());
};
