export type Page = {
  id: number;
  ordering: number;
  page_type: string;
  page_type_id: number;
  content: PageContent;
};

export type PageContent = Record<string, any>;
