import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";
import { Settings } from "../../settings";
import { compile } from "../utils/compile";

export const updatePageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { id, content } = req.body;

    // Validate input.
    if (!id || !content) {
      res.status(400).json({ error: "ID and content are required" });
      return;
    }
    if (typeof id !== "number") {
      res.status(400).json({ error: "ID must be a number" });
      return;
    }
    if (typeof content !== "string") {
      res.status(400).json({ error: "Content must be a string" });
      return;
    }

    // Update the page in the database.
    const updatePageResult = dbService.updatePage(id, content);

    if ("pageId" in updatePageResult) {
      // Compile the website and stream the output to the client.
      compile(settings, res);
      return;
    }

    switch (updatePageResult.error) {
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
