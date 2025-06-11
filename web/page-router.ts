import { Router } from "express";
import { join, normalize, resolve } from "path";
import { filePathInWebroot } from "../api/files/utils/filepath-is-safe";
import { DbService } from "../db/db-service";
import { Settings } from "../settings";

export const pageRouter = (settings: Settings, dbService: DbService): Router =>
  Router().get("*", (req, res, next) => {
    const reqPath = normalize(req.path).replace(/\/$/, "");
    const lookup = dbService.compiledPages.get(reqPath);

    if ("error" in lookup) {
      if (lookup.error !== "PathNotFound") {
        console.error(
          `🧭📜🚨 Error occurred while looking up "${reqPath}":`,
          lookup.error
        );
      }
      next();
      return;
    }

    const hash = lookup.compiledPage.hash;
    const filePath = resolve(join(settings.webroot, "pages", hash + ".html"));
    if (!filePathInWebroot(settings, filePath)) {
      next();
      return;
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(
          `🧭📜🚨 Error occurred while sending file "${filePath}" for "${reqPath}":`,
          err
        );
        next(err);
      }
    });
  });
