import { Database } from "better-sqlite3";
import { PageStore } from "../../types/page-store";
import { Page } from "../../types/page";
import { PageTypeKind } from "../../types/page-type";

type Err = "DatabaseGetError";
type RetVal = PageStore | { error: Err };

export const getPagesQuery = (db: Database) => {
  return db.transaction((): RetVal => {
    const pages = db
      .prepare(
        /* sql */
        `
        SELECT pages.id, ordering, page_types.name AS page_type, page_type_id, content FROM pages
        JOIN page_types ON pages.page_type_id = page_types.id
        ORDER BY ordering
        `
      )
      .all();
    if (pages === undefined) {
      return { error: "DatabaseGetError" };
    }
    const mappedPages = pages.map<Page>((page) => {
      const { id, ordering, page_type, page_type_id, content } = page as {
        id: number;
        ordering: number;
        page_type: string;
        page_type_id: number;
        content: string;
      };
      return {
        id,
        ordering,
        page_type,
        page_type_id,
        content: JSON.parse(content),
      };
    });

    const pageTypes = db
      .prepare(
        /* sql */
        `
        SELECT id, name, template, kind FROM page_types
        `
      )
      .all();
    if (pageTypes === undefined) {
      return { error: "DatabaseGetError" };
    }
    const mappedPageTypes = pageTypes.map((pageType) => {
      const { id, name, template, kind } = pageType as {
        id: number;
        name: string;
        template: string;
        kind: number;
      };
      return { id, name, template: JSON.parse(template), kind: mapKind(kind) };
    });

    return { pages: mappedPages, pageTypes: mappedPageTypes };
  })();
};

const mapKind = (kind: number): PageTypeKind => {
  switch (kind) {
    case 0:
      return "list";
    case 1:
      return "single";
    case 2:
      return "virtual";
    default:
      throw new Error(`Unknown page type kind: ${kind}`);
  }
}