import { RequestHandler } from "express";
import { DbService } from "../../db/db-service.js";

export const listUsersEndpoint =
  (dbService: DbService): RequestHandler =>
  async (_, res) => {
    const listUsersResult = dbService.users.list();

    if ("error" in listUsersResult) {
      switch (listUsersResult.error) {
        case "DatabaseGetError":
          res.status(500).json({ error: `Database retrieval error.` });
          return;
        default:
          const exhaustiveCheck: never = listUsersResult.error;
          res.status(500).json({
            error: `Unhandled error type: ${exhaustiveCheck}`,
          });
          return;
      }
    }

    res.status(200).json({
      users: listUsersResult.users.map((u) => ({
        id: u.id,
        username: u.username,
        level: u.level,
      })),
    });
  };
