import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal = {} | { error: Err };

export const deleteUserQuery = (db: Database, userId: number): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    DELETE FROM users WHERE id = ?
    `
  );
  const res = stmt.run(userId);
  if (res.changes === 0) {
    return { error: "DatabaseDeleteError" };
  }
  return {};
};
