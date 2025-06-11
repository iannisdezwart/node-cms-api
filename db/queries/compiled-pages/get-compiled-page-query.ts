import { Database } from "better-sqlite3";
import { CompiledPage } from "../../types/compiled-page.js";

type Err = "PathNotFound";
type RetVal = { compiledPage: CompiledPage } | { error: Err };

export const getCompiledPageQuery = (db: Database, path: string): RetVal => {
  const compiledPages = db
    .prepare(
      /* sql */
      `
      SELECT id, page_id, path, hash FROM compiled_pages WHERE path = ?
      `
    )
    .all(path) as CompiledPage[] | undefined;
  if (compiledPages === undefined || compiledPages.length < 1) {
    return { error: "PathNotFound" };
  }
  return { compiledPage: compiledPages[0] };
};
