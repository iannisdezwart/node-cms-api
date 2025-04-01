import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal = {} | { error: Err };

export const deleteUserQuery = (db: Database, username: string): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    DELETE FROM users WHERE username = ?
    `
  );
  const res = stmt.run(username);
  if (res.changes === 0) {
    return { error: "DatabaseDeleteError" };
  }
  return {};
};
