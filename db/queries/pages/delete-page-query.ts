import { Database } from "better-sqlite3";

type Err = "DatabaseDeleteError";
type RetVal = { pageId: number } | { error: Err };

export const deletePageQuery = (db: Database, id: number): RetVal =>
  db.transaction((): RetVal => {
    let updatePageRes = db
      .prepare(
        /* sql */
        `
        DELETE FROM pages
        WHERE id = ?
        `
      )
      .run(id);
    if (updatePageRes.changes === 0) {
      return { error: "DatabaseDeleteError" };
    }

    return { pageId: id };
  })();
