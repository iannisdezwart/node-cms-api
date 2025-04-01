import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";
import { Settings } from "../../settings";
import { compile } from "./utils/compile";

export const swapPagesEndpoint =
  (settings: Settings, dbService: DbService): RequestHandler =>
  (req, res) => {
    const { swaps } = req.body;

    // Validate input.
    if (!swaps || !Array.isArray(swaps)) {
      res.status(400).json({ error: "Swaps must be an array" });
      return;
    }
    if (swaps.length === 0) {
      res.status(400).json({ error: "Swaps array cannot be empty" });
      return;
    }
    for (const swap of swaps) {
      if (
        !Array.isArray(swap) ||
        swap.length !== 2 ||
        swap.some((s) => typeof s !== "number")
      ) {
        res.status(400).json({ error: "Each swap must be a [number, number]" });
        return;
      }
    }

    // Swap the pages in the database.
    const swapPagesResult = dbService.pages.swap(swaps as [number, number][]);

    if ("error" in swapPagesResult) {
      switch (swapPagesResult.error) {
        case "DatabaseUpdateError":
          res.status(500).json({
            error: `Page type not found.`,
          });
          return;
        case "OrderingIdxNotFound":
          res.status(400).json({
            error: `Ordering index not found.`,
          });
          return;
        default:
          const exhaustiveCheck: never = swapPagesResult.error;
          res.status(500).json({
            error: `Unhandled error type: ${exhaustiveCheck}`,
          });
      }
    }

    // Compile the website and stream the output to the client.
    compile(settings, res);
    return;
  };
