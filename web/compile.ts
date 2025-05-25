import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";
import { DbService } from "../db/db-service.js";
import { CompiledPage, CompiledPageEntry } from "../db/types/compiled-page.js";
import { Settings } from "../settings.js";
import { adminPageCompiler } from "./admin-panel-compiler.js";
import { workOutDependencies } from "./utils/work-out-dependency-graph.js";
import { PageType } from "../db/types/page-type.js";
import { Page } from "../db/types/page.js";

export type PageCompilerOutput = {
  html: string;
  path: string;
};

export type PageCompiler = (
  pageContent: any,
  allPages: Page[]
) => Promise<PageCompilerOutput | undefined>;

export const compile = async (
  settings: Settings,
  dbService: DbService,
  logger: (msg: string) => void
) => {
  const startTime = Date.now();
  initWebroot(settings);

  const { pageTypes: unresolvedPageTypes, pages } = getPages(dbService);
  const compiledPages = getCompiledPages(dbService);
  const outdatedPagePaths = new Set<string>(compiledPages.map((p) => p.path));
  const updatedPageTypes = new Set<string>();
  const newlyCompiledPages: CompiledPageEntry[] = [];

  const pageTypes = workOutDependencies(
    settings.dependencies,
    unresolvedPageTypes
  );
  for (const pageType of pageTypes) {
    await compilePageType(
      pageType,
      pages,
      outdatedPagePaths,
      compiledPages,
      newlyCompiledPages,
      updatedPageTypes,
      settings,
      logger
    );
  }
  compileAdminPanel(settings);

  removeOutdatedPages(settings, dbService, outdatedPagePaths, logger);
  addNewlyCompiledPages(dbService, newlyCompiledPages);

  const endTime = Date.now();
  logger(`🗂️📄✅ Compilation complete in ${endTime - startTime}ms`);
};

const initWebroot = (settings: Settings) => {
  if (!existsSync(settings.webroot)) {
    mkdirSync(settings.webroot);
  }
  if (!existsSync(join(settings.webroot, "content"))) {
    mkdirSync(join(settings.webroot, "content"));
  }
};

const getPages = (dbService: DbService) => {
  const res = dbService.pages.list();
  if ("error" in res) {
    throw new Error(`Error listing pages: ${res.error}`);
  }
  return res;
};

const getCompiledPages = (dbService: DbService) => {
  const res = dbService.compiledPages.list();
  if ("error" in res) {
    throw new Error(`Error listing compiled pages: ${res.error}`);
  }
  return res.compiledPages;
};

const compilePageType = async (
  pageType: PageType,
  pages: Page[],
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  const pageCompiler = settings.pageCompilers[pageType.name];
  if (pageCompiler === undefined) {
    console.warn(
      `⚠️📄🗂️ Page type "${pageType.name}" does not have a compiler.`
    );
    return;
  }

  const pagesOfType = pages.filter((page) => page.page_type_id === pageType.id);

  switch (pageType.kind) {
    case "list":
      await compilePageList(
        pageCompiler,
        pagesOfType,
        pageType,
        pages,
        outdatedPagePaths,
        compiledPages,
        newlyCompiledPages,
        updatedPageTypes,
        settings,
        logger
      );
      return;
    case "single":
      if (pagesOfType.length > 1) {
        console.warn(
          "⚠️📄🗂️ Singular page type has more than one page: ",
          pageType.name
        );
        throw new Error("Singular page type has more than one page");
      }
      if (pagesOfType.length === 0) {
        return;
      }
      await compilePage(
        pagesOfType[0],
        pageCompiler,
        pages,
        pageType,
        outdatedPagePaths,
        compiledPages,
        newlyCompiledPages,
        updatedPageTypes,
        settings,
        logger
      );
      return;
    case "virtual":
      if (pagesOfType.length > 1) {
        console.warn(
          "⚠️📄🗂️ Virtual page type has more than one page: ",
          pageType.name
        );
        throw new Error("Virtual page type has more than one page");
      }
      if (pagesOfType.length === 0) {
        return;
      }
      compileVirtualPage(
        pagesOfType[0],
        pageType,
        updatedPageTypes,
        compiledPages,
        newlyCompiledPages,
        outdatedPagePaths,
        settings
      );
      return;
  }
};

const compilePageList = async (
  pageCompiler: PageCompiler,
  pagesOfType: Page[],
  pageType: PageType,
  pages: Page[],
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  for (const page of pagesOfType) {
    await compilePage(
      page,
      pageCompiler,
      pages,
      pageType,
      outdatedPagePaths,
      compiledPages,
      newlyCompiledPages,
      updatedPageTypes,
      settings,
      logger
    );
  }
};

type PageChange =
  | {
      type: "new";
      hash: string;
    }
  | {
      type: "updated";
      hash: string;
    }
  | {
      type: "unchanged";
      currentPath: string;
    };

const evaluatePageChange = (
  page: Page,
  pageType: PageType,
  compiledPages: CompiledPage[],
  updatedPageTypes: Set<string>,
  settings: Settings
): PageChange => {
  const hash = createHash("md5")
    .update(
      JSON.stringify({
        type: pageType.name,
        content: page.content,
        id: page.id,
      })
    )
    .digest("hex");
  const compiledPage = compiledPages.find((p) => p.page_id === page.id);
  const changed =
    compiledPage?.hash === hash ||
    (settings.dependencies !== undefined &&
      settings.dependencies[pageType.name].some((d) =>
        updatedPageTypes.has(d)
      ));
  if (!changed) {
    if (compiledPage === undefined || !existsSync(compiledPage.path)) {
      return { type: "new", hash };
    }
    return { type: "unchanged", currentPath: compiledPage.path };
  }
  return { type: "updated", hash };
};

const compileVirtualPage = (
  page: Page,
  pageType: PageType,
  updatedPageTypes: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  outdatedPagePaths: Set<string>,
  settings: Settings
) => {
  // Virtual pages are not actually compiled, but they may have dependent
  // pages that need to know about them changing.
  const changeRes = evaluatePageChange(
    page,
    pageType,
    compiledPages,
    updatedPageTypes,
    settings
  );
  if (changeRes.type === "unchanged") {
    outdatedPagePaths.delete(changeRes.currentPath);
    return;
  }
  newlyCompiledPages.push({
    page_id: page.id,
    path: "",
    hash: changeRes.hash,
  });
};

const compilePage = async (
  page: Page,
  pageCompiler: PageCompiler,
  pages: Page[],
  pageType: PageType,
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  const changeRes = evaluatePageChange(
    page,
    pageType,
    compiledPages,
    updatedPageTypes,
    settings
  );
  if (changeRes.type === "unchanged") {
    outdatedPagePaths.delete(changeRes.currentPath);
    return;
  }

  const pageCompilerOutput = await pageCompiler(page.content, pages);
  if (pageCompilerOutput === undefined) {
    return;
  }

  writePage(settings, pageCompilerOutput, logger);
  newlyCompiledPages.push({
    hash: changeRes.hash,
    page_id: pageType.id,
    path: pageCompilerOutput.path,
  });
  outdatedPagePaths.delete(pageCompilerOutput.path);
  updatedPageTypes.add(pageType.name);
};

const writePage = (
  settings: Settings,
  pageCompilerOutput: PageCompilerOutput,
  logger: (msg: string) => void
) => {
  const webroot = resolve(settings.webroot);
  const pagePath = resolve(join(webroot, pageCompilerOutput.path));
  const pageDir = pagePath.substring(0, pagePath.lastIndexOf("/"));

  if (!pagePath.startsWith(webroot + "/")) {
    console.warn(
      `⚠️📄🗂️ Page path is outside webroot: ${pagePath} (${webroot})`
    );
    return;
  }

  if (!existsSync(pageDir)) {
    mkdirSync(pageDir, { recursive: true });
    logger(`🗂️📄🌱 Directory created: ${pageDir}`);
  }

  writeFileSync(pagePath, pageCompilerOutput.html);
  logger(`📄🖋️✅ Page written: ${pagePath}`);
};

const compileAdminPanel = (settings: Settings) => {
  const adminPanelPath = join(resolve(settings.webroot), "admin-panel");
  if (existsSync(adminPanelPath)) {
    return;
  }
  adminPageCompiler(adminPanelPath);
};

const removeOutdatedPages = (
  settings: Settings,
  dbService: DbService,
  outdatedPagePaths: Set<string>,
  logger: (msg: string) => void
) => {
  const webroot = resolve(settings.webroot);
  const contentDir = resolve(join(webroot, "content"));

  const deleteEmptyDirectories = (
    dir: string,
    logger: (msg: string) => void
  ) => {
    if (dir === contentDir) {
      return;
    }
    const files = readdirSync(dir);
    if (files.length == 0) {
      rmdirSync(dir);
      logger(`🗑️📂✅ Empty directory removed: ${dir}`);
      return;
    }
    for (let file of files) {
      const subDirPath = join(dir, file);
      if (statSync(subDirPath).isDirectory()) {
        deleteEmptyDirectories(subDirPath, logger);
      }
    }
  };

  for (const path of outdatedPagePaths) {
    const resolvedPath = join(webroot, path);
    if (!resolvedPath.startsWith(webroot + "/")) {
      console.warn(
        `⚠️📄🗑️ Outdated page path is outside webroot: ${resolvedPath}`
      );
      continue;
    }
    if (existsSync(resolvedPath)) {
      unlinkSync(resolvedPath);
    }
    logger(`🗑️📄✅ Outdated page removed: ${resolvedPath}`);
  }
  deleteEmptyDirectories(webroot, logger);
  dbService.compiledPages.deletePaths([...outdatedPagePaths]);
};

const addNewlyCompiledPages = (
  dbService: DbService,
  newlyCompiledPages: CompiledPageEntry[]
) => {
  dbService.compiledPages.addAll(newlyCompiledPages);
};
