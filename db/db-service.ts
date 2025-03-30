import BetterSqlite3 from "better-sqlite3";
import { Settings } from "../settings";
import { init as initDb } from "./init";
import { addPageQuery } from "./queries/pages/add-page-query";
import { deletePageQuery } from "./queries/pages/delete-page-query";
import { getPagesQuery } from "./queries/pages/get-pages-query";
import { swapPagesQuery } from "./queries/pages/swap-pages-query";
import { updatePageQuery } from "./queries/pages/update-page-query";
import { getUserByUsernameQuery } from "./queries/users/get-user-by-username";

export type DbService = {
  getUserByUsername(
    username: string
  ): ReturnType<typeof getUserByUsernameQuery>;
  addPage(type: string, content: string): ReturnType<typeof addPageQuery>;
  updatePage(id: number, content: string): ReturnType<typeof updatePageQuery>;
  deletePage(id: number): ReturnType<typeof deletePageQuery>;
  getPages(): ReturnType<typeof getPagesQuery>;
  swapPages(swaps: [number, number][]): ReturnType<typeof swapPagesQuery>;
};

export const getDbService = (settings: Settings): DbService => {
  const db = new BetterSqlite3("node-cms.db");
  initDb(db, settings);

  return {
    getUserByUsername: (username: string) =>
      getUserByUsernameQuery(db, username),
    addPage: (type: string, content: string) => addPageQuery(db, type, content),
    updatePage: (id: number, content: string) =>
      updatePageQuery(db, id, content),
    deletePage: (id: number) => deletePageQuery(db, id),
    getPages: () => getPagesQuery(db),
    swapPages: (swaps: [number, number][]) => swapPagesQuery(db, swaps),
  };
};
