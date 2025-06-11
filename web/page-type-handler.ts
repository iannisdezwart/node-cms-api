import {
  PageTemplate,
  PageTemplateWithTitle,
  ToTranslatedPageContentType,
  TranslatedPageContent,
} from "../db/queries/pages/utils/page-type-template";

export type PagesOfTypeGetter = <U extends PageTemplate>(
  type: string
) => ToTranslatedPageContentType<U>[];

export type PagesOfTypeUntranslatedGetter = <U extends PageTemplate>(
  type: string
) => Record<string /* langKey */ , ToTranslatedPageContentType<U>>[];

type Input<T extends TranslatedPageContent> = {
  content: T;
  lang: string;
  langs: string[];
  getPagesOfType: PagesOfTypeGetter;
  getPagesOfTypeUntranslated: PagesOfTypeUntranslatedGetter;
};

type Generator<T extends PageTemplate> = (
  input: Input<ToTranslatedPageContentType<T>>
) => Promise<string>;

type PageTypeHandlerBase<T extends PageTemplate> = {
  template: T;
  kind: "list" | "single" | "virtual";
};

export type ListPageTypeHandler<T extends PageTemplateWithTitle> =
  PageTypeHandlerBase<T> & {
    kind: "list";
    path: Generator<T>;
    html: Generator<T>;
  };

export type SinglePageTypeHandler<T extends PageTemplateWithTitle> =
  PageTypeHandlerBase<T> & {
    kind: "single";
    path: Generator<T>;
    html: Generator<T>;
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
