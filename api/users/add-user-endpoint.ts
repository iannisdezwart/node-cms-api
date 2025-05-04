import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";

export const addUserEndpoint =
  (dbService: DbService): RequestHandler =>
  async (req, res) => {
    const { username, password } = req.body;

    // Validate input.
    if (username === undefined || password === undefined) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }
    if (typeof username !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Username and password must be strings" });
      return;
    }
    if (username.length < 3 || password.length < 8) {
      res.status(400).json({
        error:
          "Username must be at least 3 characters and password at least 8 characters",
      });
      return;
    }

    const addUserResult = dbService.users.add(username, password);

    if ("error" in addUserResult) {
      switch (addUserResult.error) {
        case "DatabaseInsertError":
          res.status(500).json({ error: `Database insertion error.` });
          return;
        default:
          const exhaustiveCheck: never = addUserResult.error;
          res.status(500).json({
            error: `Unhandled error type: ${exhaustiveCheck}`,
          });
          return;
      }
    }

    res.status(200).json(addUserResult);
  };
