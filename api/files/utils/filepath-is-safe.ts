import { resolve } from "path";
import { Settings } from "../../../settings.js";

const filePathWithinDir = (path: string, dir: string): boolean => {
  const resolvedPath = resolve(path);
  const resolvedDir = resolve(dir);
  if (
    resolvedPath !== resolvedDir &&
    !resolvedPath.startsWith(resolvedDir + "/")
  ) {
    console.warn(
      `📂🚨 Unsafe file path: ${resolvedPath}, not in ${resolvedDir}`
    );
    return false;
  }
  return true;
};

export const filePathInWebroot = (settings: Settings, path: string) =>
  filePathWithinDir(path, settings.webroot);

export const filePathInContentDir = (settings: Settings, path: string) =>
  filePathWithinDir(path, resolve(settings.webroot, "content"));
