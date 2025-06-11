import { Database } from "better-sqlite3";
import { CompiledPage } from "../../types/compiled-page.js";

type Err = "DatabaseGetError";
type RetVal = { compiledPages: CompiledPage[] } | { error: Err };

export const listCompiledPagesQuery = (db: Database): RetVal => {
  const compiledPages = db
    .prepare(
      /* sql */
      `
      SELECT id, page_id, path, hash FROM compiled_pages
      `
    )
    .all() as CompiledPage[] | undefined;
  if (compiledPages === undefined) {
    return { error: "DatabaseGetError" };
  }
  return { compiledPages };
};
