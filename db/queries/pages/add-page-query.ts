import { Database } from "better-sqlite3";
import { Settings } from "../../../settings.js";
import { contentMatchesTemplate, PageContent } from "./utils/page-type-template.js";

type Err = "PageTypeNotFound" | "TemplateMismatch" | "DatabaseInsertError";
type RetVal = { pageId: number } | { error: Err };

export const addPageQuery = (
  settings: Settings,
  db: Database,
  pageType: string,
  content: PageContent
): RetVal => {
  const pageTypeHandler = settings.pageTypeHandlers[pageType];
  if (pageTypeHandler === undefined) {
    return { error: "PageTypeNotFound" };
  }

  if (!contentMatchesTemplate(pageTypeHandler.template, content)) {
    return { error: "TemplateMismatch" };
  }

  let insertPageRes = db
    .prepare(
      /* sql */
      `
        INSERT INTO pages (page_type, content, ordering)
        VALUES (?, ?, (SELECT COALESCE(MAX(ordering), 0) + 1 FROM pages))
        RETURNING id
        `
    )
    .get(pageType, JSON.stringify(content)) as { id: number } | undefined;
  if (insertPageRes === undefined) {
    return { error: "DatabaseInsertError" };
  }

  return { pageId: insertPageRes.id };
};
