import { join, resolve } from "path";
import { Settings } from "../../../settings.js";

export const filePathIsSafe = (settings: Settings, path: string): boolean => {
  const resolvedPath = resolve(path);
  const contentDir = resolve(settings.webroot, "content");
  if (
    resolvedPath !== contentDir &&
    !resolvedPath.startsWith(contentDir + "/")
  ) {
    console.log(
      `📂📄🚨 Unsafe file path: ${resolvedPath}, not in ${contentDir}`
    );
    return false;
  }

  return true;
};
