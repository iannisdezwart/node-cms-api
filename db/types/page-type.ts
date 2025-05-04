export type PageTypeKind = "list" | "single" | "virtual";
export type PageType = {
  id: number;
  name: string;
  template: PageTemplate;
  kind: PageTypeKind;
};

export type PageTemplate = Record<string, ContentType>;

export type GroupItem = {
  name: string;
  type: ContentType | GroupItem[];
};

export type ContentType =
  | "string"
  | "text"
  | "img[]"
  | "img_caption[]"
  | "img"
  | "svg"
  | "video"
  | "date"
  | "number"
  | "bool"
  | GroupItem[];
