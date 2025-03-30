export const contentMatchesTemplate = (
  templateStr: string,
  contentStr: string
): boolean => {
  const template = JSON.parse(templateStr);
  const content = JSON.parse(contentStr);

  const visited = new Set<string>();
  for (const templateKey of Object.keys(template)) {
    const contentType = template[templateKey] as string | undefined;
    if (content[templateKey] === undefined) {
      return false;
    }
    visited.add(templateKey);
    if (!contentValueMatchesType(content[templateKey], contentType)) {
      return false;
    }
  }

  for (const contentKey of Object.keys(content)) {
    const contentType = template[contentKey] as string | undefined;
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

const contentValueMatchesType = (value: any, type: any): boolean => {
  switch (type) {
    case "string":
    case "text":
    case "img":
    case "svg":
    case "video":
    case "number":
      return typeof value === "string";
    case "date":
      return typeof value === "number";
    case "bool":
      return typeof value === "boolean";
    case "img[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "img_and_caption[]":
      return (
        Array.isArray(value) &&
        value.every(
          (v) =>
            Array.isArray(v) &&
            v.length === 2 &&
            typeof v[0] === "string" &&
            typeof v[1] === "string"
        )
      );
    default:
      return valueIsValidGroupItem(type, value);
  }
};

const valueIsValidGroupItem = (
  groupType: { name: string; type: any }[],
  value: any
): boolean => {
  if (!Array.isArray(value)) {
    return false;
  }

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return false;
    }

    const visited = new Set<string>();
    for (const key of Object.keys(item)) {
      const itemType = groupType.find((t) => t.name === key);
      if (!itemType) {
        return false;
      }
      visited.add(key);
      if (!contentValueMatchesType(item[key], itemType.type)) {
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
