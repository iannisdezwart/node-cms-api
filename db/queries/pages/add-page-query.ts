import { Database } from "better-sqlite3";
import { contentMatchesTemplate } from "./utils/page-type-template";

type Err = "PageTypeNotFound" | "TemplateMismatch" | "DatabaseInsertError";
type RetVal = { pageId: number } | { error: Err };

export const addPageQuery = (
  db: Database,
  type: string,
  content: string
): RetVal =>
  db.transaction((): RetVal => {
    let pageTypeRes = db
      .prepare(
        /* sql */
        `
        SELECT template FROM page_types WHERE name = ?
        `
      )
      .get(type) as { template: string } | undefined;
    if (pageTypeRes === undefined) {
      return { error: "PageTypeNotFound" };
    }

    if (!contentMatchesTemplate(pageTypeRes.template, content)) {
      return { error: "TemplateMismatch" };
    }

    let insertPageRes = db
      .prepare(
        /* sql */
        `
        INSERT INTO pages (page_type, content)
        VALUES (?, ?)
        RETURNING id
        `
      )
      .get(type, content) as { id: number } | undefined;
    if (insertPageRes === undefined) {
      return { error: "DatabaseInsertError" };
    }

    return { pageId: insertPageRes.id };
  })();
