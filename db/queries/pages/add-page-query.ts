import { Database } from "better-sqlite3";
import { contentMatchesTemplate } from "./utils/page-type-template.js";
import { PageContent } from "../../types/page.js";

type Err = "PageTypeNotFound" | "TemplateMismatch" | "DatabaseInsertError";
type RetVal = { pageId: number } | { error: Err };

export const addPageQuery = (
  db: Database,
  type: string,
  content: PageContent
): RetVal =>
  db.transaction((): RetVal => {
    let pageTypeRes = db
      .prepare(
        /* sql */
        `
        SELECT template, id FROM page_types WHERE name = ?
        `
      )
      .get(type) as { template: string; id: number } | undefined;
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
        INSERT INTO pages (page_type_id, content, ordering)
        VALUES (?, ?, (SELECT COALESCE(MAX(ordering), 0) + 1 FROM pages))
        RETURNING id
        `
      )
      .get(pageTypeRes.id, JSON.stringify(content)) as
      | { id: number }
      | undefined;
    if (insertPageRes === undefined) {
      return { error: "DatabaseInsertError" };
    }

    return { pageId: insertPageRes.id };
  })();
