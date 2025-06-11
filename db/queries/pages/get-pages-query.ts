import { Database } from "better-sqlite3";
import { Page } from "../../types/page";

type Err = "DatabaseGetError";
type RetVal = { pages: Page[] } | { error: Err };

export const getPagesQuery = (db: Database): RetVal => {
  const pages = db
    .prepare(
      /* sql */
      `
      SELECT pages.id, ordering, page_type, content FROM pages
      ORDER BY ordering
      `
    )
    .all();
  if (pages === undefined) {
    return { error: "DatabaseGetError" };
  }
  const mappedPages = pages.map<Page>((page) => {
    const { id, ordering, page_type, content } = page as {
      id: number;
      ordering: number;
      page_type: string;
      content: string;
    };
    return {
      id,
      ordering,
      page_type,
      content: JSON.parse(content),
    };
  });

  return { pages: mappedPages };
};
