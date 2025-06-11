import { json, Router, static as staticServe } from "express";
import { apiRouter } from "./api/router.js";
import { getDbService } from "./db/db-service.js";
import { getAccessTokenService } from "./jwt/jwt-service.js";
import { Settings } from "./settings.js";
import { compile } from "./web/compile.js";
import { pageRouter } from "./web/page-router.js";
import { join } from "path";

export const nodeCmsRouter = (settings: Settings): Router => {
  const dbService = getDbService(settings);
  const jwtService = getAccessTokenService();
  compile(settings, dbService, console.log).catch((error) => {
    console.error("⚠️🎬💥 Error during initial compilation:", error);
  });

  return Router()
    .use("/admin-panel/api", json(), apiRouter(settings, dbService, jwtService))
    .use("/admin-panel", staticServe(join(settings.webroot, "admin-panel")))
    .use("/content", staticServe(join(settings.webroot, "content")))
    .use("/res", staticServe(join(settings.webroot, "res")))
    .use("/", pageRouter(settings, dbService));
};
