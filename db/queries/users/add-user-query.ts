import { Database } from "better-sqlite3";
import { Settings } from "../../../settings";
import { hashSync } from "bcrypt";

type Err = "DatabaseInsertError";
type RetVal = {} | { error: Err };

export const addUserQuery = (
  db: Database,
  settings: Settings,
  username: string,
  password: string
): RetVal => {
  const stmt = db.prepare(
    /* sql */
    `
    INSERT INTO users (username, password, level) VALUES (?, ?, ?)
    `
  );
  const hashedPassword = hashSync(password, settings.bcrypt.rounds);
  const res = stmt.run(username, hashedPassword, "normal");
  if (res.changes === 0) {
    return { error: "DatabaseInsertError" };
  }
  return {};
};
