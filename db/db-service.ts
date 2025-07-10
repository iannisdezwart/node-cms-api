import BetterSqlite3 from "better-sqlite3";
import { Settings } from "../settings.js";
import { init as initDb } from "./init.js";
import { addAllCompiledPagesQuery } from "./queries/compiled-pages/add-all-compiled-pages-query.js";
import { deleteCompiledPagesByPathsQuery } from "./queries/compiled-pages/delete-compiled-pages-by-paths-query.js";
import { getCompiledPageQuery } from "./queries/compiled-pages/get-compiled-page-query.js";
import { listCompiledPagesQuery } from "./queries/compiled-pages/list-compiled-pages-query.js";
import { addPageQuery } from "./queries/pages/add-page-query.js";
import { deletePageQuery } from "./queries/pages/delete-page-query.js";
import { getPagesQuery } from "./queries/pages/get-pages-query.js";
import { swapPagesQuery } from "./queries/pages/swap-pages-query.js";
import { updatePageQuery } from "./queries/pages/update-page-query.js";
import { addUserQuery } from "./queries/users/add-user-query.js";
import { deleteUserQuery } from "./queries/users/delete-user-query.js";
import { getUserQuery } from "./queries/users/get-user-query.js";
import { listUsersQuery } from "./queries/users/list-users-query.js";
import { updateUserPasswordQuery } from "./queries/users/update-user-password-query.js";
import { CompiledPageEntry } from "./types/compiled-page.js";
import { PageContent } from "./queries/pages/utils/page-type-template.js";

export type DbService = {
  users: {
    get(username: string): ReturnType<typeof getUserQuery>;
    list(): ReturnType<typeof listUsersQuery>;
    delete(userId: number): ReturnType<typeof deleteUserQuery>;
    add(username: string, password: string): ReturnType<typeof addUserQuery>;
    updatePassword(
      userId: number,
      newPassword: string
    ): ReturnType<typeof updateUserPasswordQuery>;
  };
  pages: {
    add(type: string, content: PageContent): ReturnType<typeof addPageQuery>;
    update(
      id: number,
      content: PageContent
    ): ReturnType<typeof updatePageQuery>;
    delete(id: number): ReturnType<typeof deletePageQuery>;
    list(): ReturnType<typeof getPagesQuery>;
    swap(swaps: [number, number][]): ReturnType<typeof swapPagesQuery>;
  };
  compiledPages: {
    get(path: string): ReturnType<typeof getCompiledPageQuery>;
    list(): ReturnType<typeof listCompiledPagesQuery>;
    deletePaths(
      paths: string[]
    ): ReturnType<typeof deleteCompiledPagesByPathsQuery>;
    addAll(entries: CompiledPageEntry[]): void;
  };
};

export const getDbService = (settings: Settings): DbService => {
  const db = new BetterSqlite3("node-cms.db");
  initDb(db, settings);

  return {
    users: {
      get: (username: string) => getUserQuery(db, username),
      list: () => listUsersQuery(db),
      delete: (userId: number) => deleteUserQuery(db, userId),
      add: (username: string, password: string) =>
        addUserQuery(db, settings, username, password),
      updatePassword: (userId: number, newPassword: string) =>
        updateUserPasswordQuery(db, settings, userId, newPassword),
    },
    pages: {
      add: (type: string, content: PageContent) =>
        addPageQuery(settings, db, type, content),
      update: (id: number, content: PageContent) =>
        updatePageQuery(settings, db, id, content),
      delete: (id: number) => deletePageQuery(db, id),
      list: () => getPagesQuery(db),
      swap: (swaps: [number, number][]) => swapPagesQuery(db, swaps),
    },
    compiledPages: {
      get: (path: string) => getCompiledPageQuery(db, path),
      list: () => listCompiledPagesQuery(db),
      deletePaths: (paths: string[]) =>
        deleteCompiledPagesByPathsQuery(db, paths),
      addAll: (entries: CompiledPageEntry[]) =>
        addAllCompiledPagesQuery(db, entries),
    },
  };
};
