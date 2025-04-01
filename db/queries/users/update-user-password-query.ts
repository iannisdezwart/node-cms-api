import { hashSync } from "bcrypt";
import { Database } from "better-sqlite3";
import { Settings } from "../../../settings";

type Err = "DatabaseUpdateError";
type RetVal = {} | { error: Err };

export const updateUserPasswordQuery = (
  db: Database,
  settings: Settings,
  username: string,
  newPassword: string
): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    UPDATE users SET password = ? WHERE username = ?
    `
  );
  const hashedPassword = hashSync(newPassword, settings.bcrypt.rounds);
  const res = stmt.run(username, hashedPassword);
  if (res.changes === 0) {
    return { error: "DatabaseUpdateError" };
  }
  return {};
};
