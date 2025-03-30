import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";
import { Settings } from "../../settings";
import { compile } from "../utils/compile";

export const addPageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { type, content } = req.body;

    // Validate input.
    if (!type || !content) {
      res.status(400).json({ error: "Type and content are required" });
      return;
    }
    if (typeof type !== "string") {
      res.status(400).json({ error: "Type must be a string" });
      return;
    }
    if (typeof content !== "string") {
      res.status(400).json({ error: "Content must be a string" });
      return;
    }
    try {
      JSON.parse(content);
    } catch {
      res.status(400).json({ error: "Content must be valid JSON" });
      return;
    }

    // Add the page to the database.
    const addPageResult = dbService.addPage(type, content);

    if ("pageId" in addPageResult) {
      // Compile the website and stream the output to the client.
      compile(settings, res);
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
