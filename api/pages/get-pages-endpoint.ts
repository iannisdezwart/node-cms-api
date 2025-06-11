import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";
import { Settings } from "../../settings.js";

export const getPagesEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const getPagesResult = dbService.pages.list();

    if ("error" in getPagesResult) {
      res.status(500).json({
        error: getPagesResult.error,
      });

      return;
    }

    res.status(200).json({
      pages: getPagesResult.pages,
      pageTypes: Object.entries(settings.pageTypeHandlers).map(
        ([name, handler]) => ({
          name,
          template: handler.template,
          kind: handler.kind,
        })
      ),
      langs: settings.langs,
    });
  };
