import { hashSync } from "bcrypt";
import { Database } from "better-sqlite3";
import { Settings } from "../../../settings.js";

type Err = "DatabaseInsertError";
type RetVal = {} | { error: Err };

export const addUserQuery = (
  db: Database,
  settings: Settings,
  username: string,
  password: string
): RetVal => {
  const hashedPassword = hashSync(password, settings.bcryptRounds);
  const runRes = db.prepare(
    /* sql */
    `
    INSERT INTO users (username, password, level) VALUES (?, ?, ?)
    `
  ).run(username, hashedPassword, "normal");
  if (runRes.changes === 0) {
    return { error: "DatabaseInsertError" };
  }
  return {};
};
