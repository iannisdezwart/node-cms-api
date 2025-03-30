import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";
import { Settings } from "../../settings";
import { compile } from "../utils/compile";

export const deletePageEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { id } = req.body;

    // Validate input.
    if (!id) {
      res.status(400).json({ error: "ID is required" });
      return;
    }
    if (typeof id !== "number") {
      res.status(400).json({ error: "ID must be a number" });
      return;
    }

    // Delete the page from the database.
    const deletePageResult = dbService.deletePage(id);

    if ("pageId" in deletePageResult) {
      // Compile the website and stream the output to the client.
      compile(settings, res);
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
