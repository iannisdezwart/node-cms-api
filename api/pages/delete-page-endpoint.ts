import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";
import { Settings } from "../../settings.js";
import { compileSite } from "./utils/compile-site.js";

export const deletePageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { id } = req.body;

    // Validate input.
    if (id === undefined) {
      res.status(400).json({ error: "ID is required" });
      return;
    }
    if (typeof id !== "number") {
      res.status(400).json({ error: "ID must be a number" });
      return;
    }

    // Delete the page from the database.
    const deletePageResult = dbService.pages.delete(id);

    if ("pageId" in deletePageResult) {
      // Compile the website and stream the output to the client.
      compileSite(settings, dbService, res);
      return;
    }

    switch (deletePageResult.error) {
      case "DatabaseDeleteError":
        res.status(500).json({
          error: `Database delete error.`,
        });
        return;
      default:
        const exhaustiveCheck: never = deletePageResult.error;
        res.status(500).json({
          error: `Unhandled error type: ${exhaustiveCheck}`,
        });
        return;
    }
  };
