import { Database } from "better-sqlite3";
import { contentMatchesTemplate, PageContent } from "./utils/page-type-template.js";
import { Settings } from "../../../settings.js";

type Err =
  | "PageNotFound"
  | "PageTypeNotFound"
  | "TemplateMismatch"
  | "DatabaseUpdateError";
type RetVal = { pageId: number } | { error: Err };

export const updatePageQuery = (
  settings: Settings,
  db: Database,
  id: number,
  content: PageContent
): RetVal =>
  db.transaction((): RetVal => {
    const pageType = db
      .prepare(
        /* sql */
        `
        SELECT page_type FROM pages WHERE id = ?
        `
      )
      .pluck()
      .get(id) as string | undefined;

    if (pageType === undefined) {
      return { error: "PageNotFound" };
    }

    const pageTypeHandler = settings.pageTypeHandlers[pageType];
    if (pageTypeHandler === undefined) {
      return { error: "PageTypeNotFound" };
    }

    if (!contentMatchesTemplate(pageTypeHandler.template, content)) {
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
      .run(JSON.stringify(content), id);
    if (updatePageRes.changes === 0) {
      return { error: "DatabaseUpdateError" };
    }

    return { pageId: id };
  })();
