import {
  PageContent,
  TranslatedPageContent,
} from "../../db/queries/pages/utils/page-type-template";
import { Page } from "../../db/types/page";
import { Settings } from "../../settings";

export type TranslatedPage = {
  id: number;
  ordering: number;
  pageType: string;
  content: Record<string /* langKey */, TranslatedPageContent>;
};

export const translatePages = (
  settings: Settings,
  pages: Page[]
): TranslatedPage[] => pages.map((page) => translatePage(settings, page));

const translatePage = (settings: Settings, page: Page): TranslatedPage => {
  const { id, ordering, page_type, content } = page;

  const translatedContent: Record<string, TranslatedPageContent> = {};
  for (const lang of settings.langs) {
    translatedContent[lang] = translate(content, lang, settings.langs[0]);
  }

  return {
    id,
    ordering,
    pageType: page_type,
    content: translatedContent,
  };
};

const translate = (
  content: PageContent,
  lang: string,
  defaultLang: string
): TranslatedPageContent => {
  const translatedContent: TranslatedPageContent = {};
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === "object" && !Array.isArray(value)) {
      translatedContent[key] = value[lang] || value[defaultLang];
    } else if (Array.isArray(value)) {
      translatedContent[key] = value.map((item) =>
        translate(item, lang, defaultLang)
      );
    } else {
      translatedContent[key] = value;
    }
  }
  return translatedContent;
};
