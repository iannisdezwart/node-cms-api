import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal = { pageId: number } | { error: Err };

export const deletePageQuery = (db: Database, id: number): RetVal =>
  db.transaction((): RetVal => {
    let pageLookupRes = db
      .prepare(
        /* sql */
        `
        SELECT id FROM pages
        WHERE id = ?
        `
      )
      .get(id) as { id: number } | undefined;
    if (pageLookupRes === undefined) {
      return { error: "DatabaseDeleteError" };
    }

    db.prepare(
      /* sql */
      `
        DELETE FROM compiled_pages
        WHERE page_id = ?
        `
    ).run(id);

    let deletePageRes = db
      .prepare(
        /* sql */
        `
        DELETE FROM pages
        WHERE id = ?
        `
      )
      .run(id);
    if (deletePageRes.changes === 0) {
      return { error: "DatabaseDeleteError" };
    }

    return { pageId: id };
  })();
