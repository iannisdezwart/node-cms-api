import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";

export const deleteUserEndpoint =
  (dbService: DbService): RequestHandler =>
  async (req, res) => {
    const { userId } = req.body;

    // Validate input.
    if (userId === undefined) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    if (typeof userId !== "number") {
      res.status(400).json({ error: "User ID must be a number" });
      return;
    }

    const deleteUserResult = dbService.users.delete(userId);

    if ("error" in deleteUserResult) {
      switch (deleteUserResult.error) {
        case "DatabaseDeleteError":
          res.status(500).json({ error: `Database deletion error.` });
          return;
        default:
          const exhaustiveCheck: never = deleteUserResult.error;
          res.status(500).json({
            error: `Unhandled error type: ${exhaustiveCheck}`,
          });
          return;
      }
    }

    res.status(200).json(deleteUserResult);
  };
