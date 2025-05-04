import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";
import { Settings } from "../../settings.js";
import { compileSite } from "./utils/compile-site.js";

export const addPageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { type, content } = req.body;

    // Validate input.
    if (type === undefined || content === undefined) {
      res.status(400).json({ error: "Type and content are required" });
      return;
    }
    if (typeof type !== "string") {
      res.status(400).json({ error: "Type must be a string" });
      return;
    }
    if (typeof content !== "object") {
      res.status(400).json({ error: "Content must be an object" });
      return;
    }

    // Add the page to the database.
    const addPageResult = dbService.pages.add(type, content);

    if ("pageId" in addPageResult) {
      // Compile the website and stream the output to the client.
      compileSite(settings, dbService, res);
      return;
    }

    switch (addPageResult.error) {
      case "PageTypeNotFound":
        res.status(400).json({
          error: `Page type "${type}" not found.`,
        });
        return;

      case "TemplateMismatch":
        res.status(400).json({
          error: `Template mismatch for page type "${type}".`,
        });
        return;
      case "DatabaseInsertError":
        res.status(500).json({
          error: `Database insert error.`,
        });
        return;
      default:
        const exhaustiveCheck: never = addPageResult.error;
        res.status(500).json({
          error: `Unhandled error type: ${exhaustiveCheck}`,
        });
        return;
    }
  };
