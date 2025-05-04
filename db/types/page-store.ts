import { Page } from "./page";
import { PageType } from "./page-type";

export type PageStore = {
  pages: Page[];
  pageTypes: PageType[];
};
