import { Database } from "better-sqlite3";
import { Page } from "../../types/page";
import { PageType } from "../../types/page-type";

type Err = "DatabaseGetError";
type RetVal = { pages: Page[]; pageTypes: PageType[] } | { error: Err };

export const getPagesQuery = (db: Database) => {
  return db.transaction((): RetVal => {
    const pages = db
      .prepare(
        /* sql */
        `
        SELECT pages.id, ordering, page_types.name AS page_type, content FROM pages
        JOIN page_types ON pages.page_type_id = page_types.id
        ORDER BY ordering
        `
      )
      .all() as Page[] | undefined;
    if (pages === undefined) {
      return { error: "DatabaseGetError" };
    }

    const pageTypes = db
      .prepare(
        /* sql */
        `
        SELECT id, name, template, can_add, compile FROM page_types
        `
      )
      .all() as PageType[] | undefined;
    if (pageTypes === undefined) {
      return { error: "DatabaseGetError" };
    }

    return { pages, pageTypes };
  })();
};
