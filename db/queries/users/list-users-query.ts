import { Database } from "better-sqlite3";
import { User } from "../../types/user.js";

type Err = "DatabaseGetError";
type RetVal = { users: User[] } | { error: Err };

export const listUsersQuery = (db: Database): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    SELECT id, username, password, level FROM users
    `
  );
  const res = stmt.all();
  if (res === undefined) {
    return { error: "DatabaseGetError" };
  }
  return { users: res as User[] };
};
