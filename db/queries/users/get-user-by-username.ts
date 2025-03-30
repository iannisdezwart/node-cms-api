import { Database } from "better-sqlite3";
import { User } from "../../types/user";

export const getUserByUsernameQuery = (
  db: Database,
  username: string
): User | undefined => {
  const stmt = db.prepare(
    /* sql */
    `
    SELECT id, username, password, level FROM users WHERE username = ?
    `
  );
  return stmt.get(username) as User | undefined;
};
