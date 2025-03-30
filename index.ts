import { json, Router } from "express";
import { apiRouter } from "./api/router";
import { getDbService } from "./db/db-service";
import { getAccessTokenService } from "./jwt/jwt-service";
import { Settings } from "./settings";

export const nodeCmsRouter = (settings: Settings) => {
  const dbService = getDbService(settings);
  const jwtService = getAccessTokenService();

  return Router()
    .use("/api", json(), apiRouter(settings, dbService, jwtService))
    .use("/", webRouter());
};
