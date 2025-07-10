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
import { CompiledPage, CompiledPageEntry } from "../db/types/compiled-page.js";
import { Settings } from "../settings.js";
import { adminPageCompiler } from "./admin-panel-compiler.js";
import {
  ListPageTypeHandler,
  PageGeneratorInput,
  PageTypeHandler,
  PageTypeHandlerToTranslatedPageContentType,
  SinglePageTypeHandler,
} from "./page-type-handler.js";
import { TranslatedPage, translatePages } from "./utils/translate.js";
import { workOutDependencies } from "./utils/work-out-dependency-graph.js";

export const compile = async (
  settings: Settings,
  dbService: DbService,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  const startTime = Date.now();
  initWebroot(settings);
  compileAdminPanel(settings);

  const compiledPages = getCompiledPages(dbService);
  const outdatedPageWebPaths = new Set<string>(compiledPages.map((p) => p.path));
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
      outdatedPageWebPaths,
      compiledPages,
      newlyCompiledPages,
      updatedPageTypes,
      settings,
      logger
    );
  }

  addNewlyCompiledPages(dbService, newlyCompiledPages);
  removeOutdatedPages(settings, dbService, outdatedPageWebPaths, logger);

  const endTime = Date.now();
  logger("info", `🗂️📄✅ Compilation complete in ${endTime - startTime}ms`);
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
  outdatedPageWebPaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  const pagesOfType = pages.filter((page) => page.pageType === pageTypeName);

  switch (pageTypeHandler.kind) {
    case "list":
      await compilePageList(
        pagesOfType,
        pageTypeName,
        pageTypeHandler,
        pages,
        outdatedPageWebPaths,
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
        outdatedPageWebPaths,
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
        outdatedPageWebPaths,
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
  outdatedPageWebPaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  for (const page of pagesOfType) {
    await compilePage(
      page,
      pageTypeName,
      pageTypeHandler,
      pages,
      outdatedPageWebPaths,
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
      currentWebPath: string;
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
  const compiledPage = compiledPages.find(
    (p) => p.page_id === page.id && p.path.startsWith(`/${lang}`)
  );
  const changed =
    compiledPage?.hash !== hash ||
    (settings.dependencies !== undefined &&
      settings.dependencies[pageTypeName].some((d) => updatedPageTypes.has(d)));

  const storagePath = join(resolve(settings.webroot), "pages", hash + ".html");
  if (!changed) {
    if (compiledPage === undefined || !existsSync(storagePath)) {
      return { type: "new", hash };
    }
    return { type: "unchanged", currentWebPath: compiledPage.path };
  }
  return { type: "updated", hash };
};

const compileVirtualPage = (
  page: TranslatedPage,
  pageTypeName: string,
  updatedPageTypes: Set<string>,
  compiledPages: CompiledPage[],
  outdatedPageWebPaths: Set<string>,
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
    outdatedPageWebPaths.delete(changeRes.currentWebPath);
  } else {
    updatedPageTypes.add(pageTypeName);
  }
};

const compilePage = async (
  page: TranslatedPage,
  pageTypeName: string,
  pageTypeHandler: SinglePageTypeHandler<any> | ListPageTypeHandler<any>,
  pages: TranslatedPage[],
  outdatedPageWebPaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  for (const lang of settings.langs) {
    await compilePageForLang(
      page,
      pageTypeName,
      pageTypeHandler,
      pages,
      lang,
      outdatedPageWebPaths,
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
  outdatedPageWebPaths: Set<string>,
  compiledPages: CompiledPage[],
  newlyCompiledPages: CompiledPageEntry[],
  updatedPageTypes: Set<string>,
  settings: Settings,
  logger: (level: "debug" | "info", msg: string) => void
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
    outdatedPageWebPaths.delete(changeRes.currentWebPath);
    return;
  }

  const input: PageGeneratorInput<(typeof page)["content"][number]> = {
    content: page.content[lang],
    lang,
    langs: settings.langs,
    pageCache: new Map<string, any>(),
    getPagesOfType: (pageTypeHandlers, type) =>
      pages
        .filter((p) => p.pageType === type)
        .map(
          (p) =>
            p.content[lang] as PageTypeHandlerToTranslatedPageContentType<
              Awaited<ReturnType<typeof pageTypeHandlers>>,
              typeof type
            >
        ),
  };
  const webPath = await pageTypeHandler.path(input);
  const html = await pageTypeHandler.html(input);

  writePage(settings, changeRes.hash, html, webPath, logger);
  newlyCompiledPages.push({
    hash: changeRes.hash,
    page_id: page.id,
    path: webPath,
  });
  outdatedPageWebPaths.delete(webPath);
  updatedPageTypes.add(pageTypeName);
};

const writePage = (
  settings: Settings,
  hash: string,
  html: string,
  webPath: string,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  const storagePath = resolve(join(settings.webroot, "pages", hash + ".html"));

  if (!filePathInWebroot(settings, storagePath)) {
    console.warn(`⚠️📄🗂️ Page path is outside webroot: ${storagePath}`);
    return;
  }

  writeFileSync(storagePath, html);
  logger("info", `📄🖋️✅ Page written: "${webPath}" | "${storagePath}"`);
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
  outdatedPageWebPaths: Set<string>,
  logger: (level: "debug" | "info", msg: string) => void
) => {
  const res = dbService.compiledPages.deletePaths([...outdatedPageWebPaths]);
  if ("error" in res) {
    throw new Error(`Error deleting outdated compiled pages: ${res.error}`);
  }
  if (outdatedPageWebPaths.size !== 0) {
    logger(
      "info",
      `🗑️📄✅ Outdated pages removed: ${[...outdatedPageWebPaths].join(", ")}`
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
      logger("info", `🗑️📄✅ Outdated page file removed: ${filePath}`);
    }
  }
};

const addNewlyCompiledPages = (
  dbService: DbService,
  newlyCompiledPages: CompiledPageEntry[]
) => {
  dbService.compiledPages.addAll(newlyCompiledPages);
};
