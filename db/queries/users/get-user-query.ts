import { Database } from "better-sqlite3";
import { User } from "../../types/user.js";

type Err = "DatabaseGetError";
type RetVal = { user: User } | { error: Err };

export const getUserQuery = (db: Database, username: string): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    SELECT id, username, password, level FROM users WHERE username = ?
    `
  );
  const res = stmt.get(username);
  if (res === undefined) {
    return { error: "DatabaseGetError" };
  }
  return { user: res as User };
};
