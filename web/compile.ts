import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join, parse, resolve } from "path";
import { filePathInWebroot } from "../api/files/utils/filepath-is-safe.js";
import { DbService } from "../db/db-service.js";
import {
  PageTemplate,
  ToTranslatedPageContentType,
} from "../db/queries/pages/utils/page-type-template.js";
import { CompiledPage, CompiledPageEntry } from "../db/types/compiled-page.js";
import { Settings } from "../settings.js";
import { adminPageCompiler } from "./admin-panel-compiler.js";
import {
  ListPageTypeHandler,
  PageTypeHandler,
  SinglePageTypeHandler,
} from "./page-type-handler.js";
import { TranslatedPage, translatePages } from "./utils/translate.js";
import { workOutDependencies } from "./utils/work-out-dependency-graph.js";

export const compile = async (
  settings: Settings,
  dbService: DbService,
  logger: (msg: string) => void
) => {
  const startTime = Date.now();
  initWebroot(settings);
  compileAdminPanel(settings);

  const compiledPages = getCompiledPages(dbService);
  const outdatedPagePaths = new Set<string>(compiledPages.map((p) => p.path));
  const updatedPageTypes = new Set<string>();
  const newlyCompiledPages: CompiledPageEntry[] = [];

  const pages = translatePages(settings, getPages(dbService));
  const pageTypeHandlers = workOutDependencies(settings);
  for (const [pageTypeName, pageTypeHandler] of Object.entries(
    pageTypeHandlers
  )) {
    await compilePageType(
      pageTypeName,
      pageTypeHandler,
      pages,
      outdatedPagePaths,
      compiledPages,
      newlyCompiledPages,
      updatedPageTypes,
      settings,
      logger
    );
  }

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
  if (!existsSync(join(settings.webroot, "pages"))) {
    mkdirSync(join(settings.webroot, "pages"));
  }
};

const getPages = (dbService: DbService) => {
  const res = dbService.pages.list();
  if ("error" in res) {
    throw new Error(`Error listing pages: ${res.error}`);
  }
  return res.pages;
};

const getCompiledPages = (dbService: DbService) => {
  const res = dbService.compiledPages.list();
  if ("error" in res) {
    throw new Error(`Error listing compiled pages: ${res.error}`);
  }
  return res.compiledPages;
};

const compilePageType = async (
  pageTypeName: string,
  pageTypeHandler: PageTypeHandler<any>,
  pages: TranslatedPage[],
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  const pagesOfType = pages.filter((page) => page.pageType === pageTypeName);

  switch (pageTypeHandler.kind) {
    case "list":
      await compilePageList(
        pagesOfType,
        pageTypeName,
        pageTypeHandler,
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
          pageTypeName
        );
        throw new Error("Singular page type has more than one page");
      }
      if (pagesOfType.length === 0) {
        return;
      }
      await compilePage(
        pagesOfType[0],
        pageTypeName,
        pageTypeHandler,
        pages,
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
          pageTypeName
        );
        throw new Error("Virtual page type has more than one page");
      }
      if (pagesOfType.length === 0) {
        return;
      }
      compileVirtualPage(
        pagesOfType[0],
        pageTypeName,
        updatedPageTypes,
        compiledPages,
        outdatedPagePaths,
        settings
      );
      return;
  }
};

const compilePageList = async (
  pagesOfType: TranslatedPage[],
  pageTypeName: string,
  pageTypeHandler: ListPageTypeHandler<any>,
  pages: TranslatedPage[],
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
      pageTypeName,
      pageTypeHandler,
      pages,
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
  page: TranslatedPage,
  lang: string | undefined,
  pageTypeName: string,
  compiledPages: CompiledPage[],
  updatedPageTypes: Set<string>,
  settings: Settings
): PageChange => {
  const hash = createHash("md5")
    .update(
      JSON.stringify({
        type: pageTypeName,
        lang,
        content: lang === undefined ? page.content : page.content[lang],
        id: page.id,
      })
    )
    .digest("hex");
  const compiledPage = compiledPages.find((p) => p.page_id === page.id);
  const changed =
    compiledPage?.hash === hash ||
    (settings.dependencies !== undefined &&
      settings.dependencies[pageTypeName].some((d) => updatedPageTypes.has(d)));
  if (!changed) {
    if (compiledPage === undefined || !existsSync(compiledPage.path)) {
      return { type: "new", hash };
    }
    return { type: "unchanged", currentPath: compiledPage.path };
  }
  return { type: "updated", hash };
};

const compileVirtualPage = (
  page: TranslatedPage,
  pageTypeName: string,
  updatedPageTypes: Set<string>,
  compiledPages: CompiledPage[],
  outdatedPagePaths: Set<string>,
  settings: Settings
) => {
  // Virtual pages are not actually compiled, but they may have dependent
  // pages that need to know about them changing.
  const changeRes = evaluatePageChange(
    page,
    undefined, // Virtual pages do not have a language
    pageTypeName,
    compiledPages,
    updatedPageTypes,
    settings
  );
  if (changeRes.type === "unchanged") {
    outdatedPagePaths.delete(changeRes.currentPath);
  }
};

const compilePage = async (
  page: TranslatedPage,
  pageTypeName: string,
  pageTypeHandler: SinglePageTypeHandler<any> | ListPageTypeHandler<any>,
  pages: TranslatedPage[],
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  for (const lang of settings.langs) {
    await compilePageForLang(
      page,
      pageTypeName,
      pageTypeHandler,
      pages,
      lang,
      outdatedPagePaths,
      compiledPages,
      newlyCompiledPages,
      updatedPageTypes,
      settings,
      logger
    );
  }
};

const compilePageForLang = async (
  page: TranslatedPage,
  pageTypeName: string,
  pageTypeHandler: SinglePageTypeHandler<any> | ListPageTypeHandler<any>,
  pages: TranslatedPage[],
  lang: string,
  outdatedPagePaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (msg: string) => void
) => {
  const changeRes = evaluatePageChange(
    page,
    lang,
    pageTypeName,
    compiledPages,
    updatedPageTypes,
    settings
  );
  if (changeRes.type === "unchanged") {
    outdatedPagePaths.delete(changeRes.currentPath);
    return;
  }

  const input = {
    content: page.content[lang],
    lang,
    langs: settings.langs,
    getPagesOfType: <U extends PageTemplate>(type: string) =>
      pages
        .filter((p) => p.pageType === type)
        .map((p) => p.content[lang] as ToTranslatedPageContentType<U>),
    getPagesOfTypeUntranslated: <U extends PageTemplate>(type: string) =>
      pages
        .filter((p) => p.pageType === type)
        .map(
          (p) =>
            p.content as Record<
              string /* langKey */,
              ToTranslatedPageContentType<U>
            >
        ),
  };
  const html = await pageTypeHandler.html(input);
  const path = await pageTypeHandler.path(input);

  writePage(settings, changeRes.hash, html, path, logger);
  newlyCompiledPages.push({
    hash: changeRes.hash,
    page_id: page.id,
    path,
  });
  outdatedPagePaths.delete(path);
  updatedPageTypes.add(pageTypeName);
};

const writePage = (
  settings: Settings,
  hash: string,
  html: string,
  path: string,
  logger: (msg: string) => void
) => {
  const storagePath = resolve(join(settings.webroot, "pages", hash + ".html"));

  if (!filePathInWebroot(settings, storagePath)) {
    console.warn(`⚠️📄🗂️ Page path is outside webroot: ${storagePath}`);
    return;
  }

  writeFileSync(storagePath, html);
  logger(`📄🖋️✅ Page written: "${path}" | "${storagePath}"`);
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
  const res = dbService.compiledPages.deletePaths([...outdatedPagePaths]);
  if ("error" in res) {
    throw new Error(`Error deleting outdated compiled pages: ${res.error}`);
  }
  if (outdatedPagePaths.size !== 0) {
    logger(
      `🗑️📄✅ Outdated pages removed: ${[...outdatedPagePaths].join(", ")}`
    );
  }
  const webroot = resolve(settings.webroot);
  const pagesDir = join(webroot, "pages");
  const hashes = new Set(res.remainingPages.map((p) => p.hash));
  for (const file of readdirSync(pagesDir)) {
    const hash = parse(file).name;
    if (!hashes.has(hash)) {
      const filePath = join(pagesDir, file);
      unlinkSync(filePath);
      logger(
        `🗑️📄✅ Outdated page file removed: ${filePath} | ${
          res.remainingPages.find((rem) => rem.hash == hash)?.path
        }`
      );
    }
  }
};

const addNewlyCompiledPages = (
  dbService: DbService,
  newlyCompiledPages: CompiledPageEntry[]
) => {
  dbService.compiledPages.addAll(newlyCompiledPages);
};
