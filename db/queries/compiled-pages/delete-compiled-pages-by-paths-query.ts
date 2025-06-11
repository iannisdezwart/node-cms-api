import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal =
  | { deletedCount: number; remainingPages: { hash: string; path: string }[] }
  | { error: Err };

export const deleteCompiledPagesByPathsQuery = (
  db: Database,
  paths: string[]
): RetVal =>
  db.transaction((): RetVal => {
    const runResult = db
      .prepare(
        /* sql */
        `
        DELETE FROM compiled_pages WHERE path IN ${list(paths)}
        `
      )
      .run(paths);
    if (runResult.changes === undefined) {
      return { error: "DatabaseDeleteError" };
    }

    const remainingPages = db
      .prepare(
        /* sql */
        `
        SELECT hash FROM compiled_pages
        `
      )
      .all() as { hash: string; path: string }[] | undefined;
    if (remainingPages === undefined) {
      return { error: "DatabaseDeleteError" };
    }

    return { deletedCount: runResult.changes, remainingPages };
  })();

const list = (arr: any[]): string => `(${arr.map(() => "?").join(", ")})`;
