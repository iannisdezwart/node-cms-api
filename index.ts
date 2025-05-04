import { json, Router, static as staticServe } from "express";
import { apiRouter } from "./api/router.js";
import { getDbService } from "./db/db-service.js";
import { getAccessTokenService } from "./jwt/jwt-service.js";
import { Settings } from "./settings.js";
import { compile } from "./web/compile.js";

export const nodeCmsRouter = (settings: Settings): Router => {
  const dbService = getDbService(settings);
  const jwtService = getAccessTokenService();
  compile(settings, dbService, console.log);

  return Router()
    .use("/admin-panel/api", json(), apiRouter(settings, dbService, jwtService))
    .use("/", staticServe(settings.webroot));
};
