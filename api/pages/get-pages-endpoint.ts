import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";

export const getPagesEndpoint =
  (dbService: DbService): RequestHandler =>
  (req, res) => {
    const getPagesResult = dbService.pages.list();

    if ("error" in getPagesResult) {
      res.status(500).json({
        error: getPagesResult.error,
      });

      return;
    }

    res.status(200).json(getPagesResult);
  };
