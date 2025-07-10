import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";

export const updateUserPasswordEndpoint =
  (dbService: DbService): RequestHandler =>
  async (req, res) => {
    const { userId, newPassword } = req.body;

    // Validate input.
    if (userId === undefined || newPassword === undefined) {
      res.status(400).json({ error: "User ID and new password are required" });
      return;
    }
    if (typeof userId !== "number" || typeof newPassword !== "string") {
      res.status(400).json({
        error: "User ID must be a number and new password must be a string",
      });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({
        error: "New password at least 8 characters",
      });
      return;
    }

    const updateUserResult = dbService.users.updatePassword(
      userId,
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
