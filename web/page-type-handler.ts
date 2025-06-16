import {
  PageTemplate,
  PageTemplateWithTitle,
  ToTranslatedPageContentType,
  TranslatedPageContent,
} from "../db/queries/pages/utils/page-type-template";

export type PageTypeHandlerToTranslatedPageContentType<
  T extends PageTypeHandlersExt,
  U extends keyof T
> = ToTranslatedPageContentType<
  T[U] extends PageTypeHandler<infer V> ? V : never
>;

export type PagesOfTypeGetter = <
  T extends PageTypeHandlersExt,
  U extends keyof T,
>(
  pageTypeHandlers: () => Promise<T>,
  type: U
) => PageTypeHandlerToTranslatedPageContentType<T, U>[];

export type PageGeneratorInput<T extends TranslatedPageContent> = {
  content: T;
  lang: string;
  langs: string[];
  pageCache: Map<string, any>;
  getPagesOfType: PagesOfTypeGetter;
};

type PageGenerator<T extends PageTemplate> = (
  input: PageGeneratorInput<ToTranslatedPageContentType<T>>
) => Promise<string>;

type PageTypeHandlerBase<T extends PageTemplate> = {
  template: T;
  kind: "list" | "single" | "virtual";
};

export type ListPageTypeHandler<T extends PageTemplateWithTitle> =
  PageTypeHandlerBase<T> & {
    kind: "list";
    path: PageGenerator<T>;
    html: PageGenerator<T>;
  };

export type SinglePageTypeHandler<T extends PageTemplateWithTitle> =
  PageTypeHandlerBase<T> & {
    kind: "single";
    path: PageGenerator<T>;
    html: PageGenerator<T>;
  };

export type VirtualPageTypeHandler<T extends PageTemplate> =
  PageTypeHandlerBase<T> & {
    kind: "virtual";
  };

export type PageTypeHandler<T extends PageTemplate> =
  | ListPageTypeHandler<T extends PageTemplateWithTitle ? T : never>
  | SinglePageTypeHandler<T extends PageTemplateWithTitle ? T : never>
  | VirtualPageTypeHandler<T>;

export const definePage = <T extends PageTemplate>(
  handler: PageTypeHandler<T>
) => handler;

type PageTypeHandlersExt = Record<string, PageTypeHandler<any>>;

export const definePageTypeHandlers = <T extends PageTypeHandlersExt>(
  fn: () => Promise<T>
) => fn;
