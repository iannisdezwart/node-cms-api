import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal = { deletedCount: number } | { error: Err };

export const deleteCompiledPagesByPathsQuery = (
  db: Database,
  paths: string[]
): RetVal => {
  const runResult = db
    .prepare(
      /* sql */
      `
      DELETE FROM compiled_pages WHERE path IN ${list(paths)}
      `
    )
    .run(paths);
  return { deletedCount: runResult.changes };
};

const list = (arr: any[]): string => `(${arr.map(() => "?").join(", ")})`;
