import { Database } from "better-sqlite3";
import { CompiledPage, CompiledPageEntry } from "../../types/compiled-page.js";

type Err = "DatabaseInsertError";
type RetVal = { addedCount: number } | { error: Err };

export const addAllCompiledPagesQuery = (
  db: Database,
  entries: CompiledPageEntry[]
): RetVal => {
  if (entries.length === 0) {
    return { addedCount: 0 };
  }
  const runRes = db
    .prepare(
      /* sql */
      `
      INSERT INTO compiled_pages (page_id, path, hash)
      VALUES ${values(entries)}
      ON CONFLICT(path) DO UPDATE SET
        path = excluded.path,
        hash = excluded.hash
      `
    )
    .run(...entries.flatMap((e) => [e.page_id, e.path, e.hash]));
  return { addedCount: runRes.changes };
};

const values = (arr: any[]): string => arr.map(() => "(?, ?, ?)").join(", ");
