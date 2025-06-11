import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";
import { Settings } from "../../settings.js";
import { compileSite } from "./utils/compile-site.js";

export const updatePageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { id, content } = req.body;

    // Validate input.
    if (id === undefined || content === undefined) {
      res.status(400).json({ error: "ID and content are required" });
      return;
    }
    if (typeof id !== "number") {
      res.status(400).json({ error: "ID must be a number" });
      return;
    }
    if (typeof content !== "object") {
      res.status(400).json({ error: "Content must be an object" });
      return;
    }

    // Update the page in the database.
    const updatePageResult = dbService.pages.update(id, content);

    if ("pageId" in updatePageResult) {
      // Compile the website and stream the output to the client.
      compileSite(settings, dbService, res);
      return;
    }

    switch (updatePageResult.error) {
      case "PageNotFound":
        res.status(404).json({
          error: `Page with ID ${id} not found.`,
        });
        return;
      case "PageTypeNotFound":
        res.status(500).json({
          error: `Page type not found.`,
        });
        return;
      case "TemplateMismatch":
        res.status(400).json({
          error: `Content template mismatch.`,
        });
        return;
      case "DatabaseUpdateError":
        res.status(500).json({
          error: `Database update error.`,
        });
        return;
      default:
        const _exhaustiveCheck: never = updatePageResult.error;
        throw new Error(`Unhandled error type: ${updatePageResult.error}`);
    }
  };
