import { Database } from "better-sqlite3";
import { contentMatchesTemplate } from "./utils/page-type-template";

type Err = "PageTypeNotFound" | "TemplateMismatch" | "DatabaseUpdateError";
type RetVal = { pageId: number } | { error: Err };

export const updatePageQuery = (
  db: Database,
  id: number,
  content: string
): RetVal =>
  db.transaction((): RetVal => {
    let pageTypeRes = db
      .prepare(
        /* sql */
        `
        SELECT template FROM page_types WHERE page_types.id = (
          SELECT page_type_id FROM pages WHERE pages.id = ?
        )
        `
      )
      .get(id) as { template: string } | undefined;
    if (pageTypeRes === undefined) {
      return { error: "PageTypeNotFound" };
    }

    if (!contentMatchesTemplate(pageTypeRes.template, content)) {
      return { error: "TemplateMismatch" };
    }

    let updatePageRes = db
      .prepare(
        /* sql */
        `
        UPDATE pages
        SET content = ?
        WHERE id = ?
        `
      )
      .run(content, id);
    if (updatePageRes.changes === 0) {
      return { error: "DatabaseUpdateError" };
    }

    return { pageId: id };
  })();
