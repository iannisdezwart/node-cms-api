import { RequestHandler } from "express";
import { DbService } from "../../db/db-service";

export const updateUserPasswordEndpoint =
  (dbService: DbService): RequestHandler =>
  async (req, res) => {
    const { username, newPassword } = req.body;

    // Validate input.
    if (!username || !newPassword) {
      res.status(400).json({ error: "Username and new password are required" });
      return;
    }
    if (typeof username !== "string" || typeof newPassword !== "string") {
      res
        .status(400)
        .json({ error: "Username and new password must be strings" });
      return;
    }
    if (username.length < 3 || newPassword.length < 8) {
      res.status(400).json({
        error:
          "Username must be at least 3 characters and new password at least 8 characters",
      });
      return;
    }

    const updateUserResult = dbService.users.updatePassword(
      username,
      newPassword
    );

    if ("error" in updateUserResult) {
      switch (updateUserResult.error) {
        case "DatabaseUpdateError":
          res.status(500).json({ error: `Database update error.` });
          return;
        default:
          const exhaustiveCheck: never = updateUserResult.error;
          res.status(500).json({
            error: `Unhandled error type: ${exhaustiveCheck}`,
          });
          return;
      }
    }

    res.status(200).json(updateUserResult);
  };
