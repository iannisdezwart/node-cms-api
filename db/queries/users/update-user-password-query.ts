import { hashSync } from "bcrypt";
import { Database } from "better-sqlite3";
import { Settings } from "../../../settings.js";

type Err = "DatabaseUpdateError";
type RetVal = {} | { error: Err };

export const updateUserPasswordQuery = (
  db: Database,
  settings: Settings,
  userId: number,
  newPassword: string
): RetVal => {
  const hashedPassword = hashSync(newPassword, settings.bcryptRounds);
  const res = db
    .prepare(
      /* sql */
      `
      UPDATE users SET password = ? WHERE id = ?
      `
    )
    .run(hashedPassword, userId);
  if (res.changes === 0) {
    return { error: "DatabaseUpdateError" };
  }
  return {};
};
