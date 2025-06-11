import { PageContent } from "../queries/pages/utils/page-type-template";

export type Page = {
  id: number;
  ordering: number;
  page_type: string;
  content: PageContent;
};