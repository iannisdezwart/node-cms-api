import BetterSqlite3 from "better-sqlite3";
import { Settings } from "../settings";
import { init as initDb } from "./init";
import { addPageQuery } from "./queries/pages/add-page-query";
import { deletePageQuery } from "./queries/pages/delete-page-query";
import { getPagesQuery } from "./queries/pages/get-pages-query";
import { swapPagesQuery } from "./queries/pages/swap-pages-query";
import { updatePageQuery } from "./queries/pages/update-page-query";
import { addUserQuery } from "./queries/users/add-user-query";
import { deleteUserQuery } from "./queries/users/delete-user-query";
import { getUserQuery } from "./queries/users/get-user-query";
import { listUsersQuery } from "./queries/users/list-users-query";
import { updateUserPasswordQuery } from "./queries/users/update-user-password-query";

export type DbService = {
  users: {
    get(username: string): ReturnType<typeof getUserQuery>;
    list(): ReturnType<typeof listUsersQuery>;
    delete(username: string): ReturnType<typeof deleteUserQuery>;
    add(username: string, password: string): ReturnType<typeof addUserQuery>;
    updatePassword(
      username: string,
      newPassword: string
    ): ReturnType<typeof updateUserPasswordQuery>;
  };
  pages: {
    add(type: string, content: string): ReturnType<typeof addPageQuery>;
    update(id: number, content: string): ReturnType<typeof updatePageQuery>;
    delete(id: number): ReturnType<typeof deletePageQuery>;
    list(): ReturnType<typeof getPagesQuery>;
    swap(swaps: [number, number][]): ReturnType<typeof swapPagesQuery>;
  };
};

export const getDbService = (settings: Settings): DbService => {
  const db = new BetterSqlite3("node-cms.db");
  initDb(db, settings);

  return {
    users: {
      get: (username: string) => getUserQuery(db, username),
      list: () => listUsersQuery(db),
      delete: (username: string) => deleteUserQuery(db, username),
      add: (username: string, password: string) =>
        addUserQuery(db, settings, username, password),
      updatePassword: (username: string, newPassword: string) =>
        updateUserPasswordQuery(db, settings, username, newPassword),
    },
    pages: {
      add: (type: string, content: string) => addPageQuery(db, type, content),
      update: (id: number, content: string) => updatePageQuery(db, id, content),
      delete: (id: number) => deletePageQuery(db, id),
      list: () => getPagesQuery(db),
      swap: (swaps: [number, number][]) => swapPagesQuery(db, swaps),
    },
  };
};
