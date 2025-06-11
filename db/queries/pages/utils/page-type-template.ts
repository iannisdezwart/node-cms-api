export type PageTemplate = Record<string, ContentType>;
export type PageTemplateWithTitle = PageTemplate & {
  title: "string" | "text";
};

export type GroupItem = {
  name: string;
  type: ContentType;
};

export type ContentType =
  | "string"
  | "text"
  | "img"
  | "svg"
  | "video"
  | "date"
  | "number"
  | "bool"
  | readonly GroupItem[];

export type PageContent = Record<string, ContentValue>;
export type Text = string | Record<string /* langKey */, string>;
export type ContentValue = Text | string | number | boolean | PageContent[];

export type TranslatedPageContent = Record<string, TranslatedContentValue>;
export type TranslatedContentValue =
  | string
  | number
  | boolean
  | TranslatedPageContent[];

export type ToTranslatedPageContentType<T extends PageTemplate> = {
  [K in keyof T]: ContentTypeToTranslatedContentValue<T[K]>;
};

type ContentTypeToTranslatedContentValue<T> = T extends
  | "string"
  | "text"
  | "img"
  | "svg"
  | "video"
  | "number"
  ? string
  : T extends "date"
  ? number
  : T extends "bool"
  ? boolean
  : T extends readonly GroupItem[]
  ? {
      [I in T[number] as I["name"]]: ContentTypeToTranslatedContentValue<
        I["type"]
      >;
    }[]
  : never;

export const contentMatchesTemplate = (
  template: PageTemplate,
  content: PageContent
): boolean => {
  const visited = new Set<string>();
  for (const templateKey of Object.keys(template)) {
    const contentType = template[templateKey];
    if (content[templateKey] === undefined) {
      return false;
    }
    visited.add(templateKey);
    if (!contentValueMatchesType(content[templateKey], contentType)) {
      return false;
    }
  }

  for (const contentKey of Object.keys(content)) {
    const contentType = template[contentKey];
    if (contentType === undefined) {
      return false;
    }
    if (visited.has(contentKey)) {
      continue;
    }
    if (!contentValueMatchesType(content[contentKey], contentType)) {
      return false;
    }
  }
  return true;
};

const contentValueMatchesType = (
  value: ContentValue,
  type: ContentType
): boolean => {
  switch (type) {
    case "string":
    case "text":
      return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.values(value).every((v) => typeof v === "string")
      );
    case "img":
    case "svg":
    case "video":
    case "number":
      return typeof value === "string";
    case "date":
      return typeof value === "number";
    case "bool":
      return typeof value === "boolean";
    default:
      return valueIsValidGroupItem(type, value);
  }
};

const valueIsValidGroupItem = (
  groupType: readonly GroupItem[],
  value: ContentValue
): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const visited = new Set<string>();
    for (const [key, value] of Object.entries(item)) {
      const itemType = groupType.find((t) => t.name === key);
      if (!itemType) {
        return false;
      }
      visited.add(key);
      if (!contentValueMatchesType(value, itemType.type)) {
        return false;
      }
    }

    for (const { name, type } of groupType) {
      if (visited.has(name)) {
        continue;
      }
      if (item[name] === undefined) {
        return false;
      }
      if (!contentValueMatchesType(item[name], type)) {
        return false;
      }
    }
  }

  return true;
};
