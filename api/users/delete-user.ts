import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";

export const deleteUserEndpoint =
  (dbService: DbService): RequestHandler =>
  async (req, res) => {
    const { username } = req.body;

    // Validate input.
    if (!username) {
      res.status(400).json({ error: "Username is required" });
      return;
    }
    if (typeof username !== "string") {
      res.status(400).json({ error: "Username must be a string" });
      return;
    }

    const deleteUserResult = dbService.users.delete(username);

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
