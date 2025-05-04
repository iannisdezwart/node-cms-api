import { RequestHandler } from "express";
import { rmSync } from "fs";
import { Settings } from "../../settings.js";
import { filePathIsSafe } from "./utils/filepath-is-safe.js";
import { updateThumbnailCache } from "./utils/update-thumbnail-cache.js";
import { join, resolve } from "path";

export const deleteFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const { paths } = req.body;

    // Validate input.
    if (paths === undefined || !Array.isArray(paths)) {
      res.status(400).json({ error: "Paths must be an array" });
      return;
    }
    if (paths.length === 0) {
      res.status(400).json({ error: "No paths provided" });
      return;
    }
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (typeof path !== "string") {
        res.status(400).json({ error: "Path must be a string" });
        return;
      }
      const resolvedPath = resolve(join(settings.webroot, "content", path));
      paths[i] = resolvedPath;
      if (!filePathIsSafe(settings, resolvedPath)) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }
    }

    // Delete files.
    for (const path of paths) {
      if (!deleteFile(path)) {
        res.status(500).json({ error: `Failed to delete file: ${path}` });
        return;
      }
    }

    updateThumbnailCache(settings);

    // Send response.
    res.json({ message: "Files deleted successfully" });
  };

const deleteFile = (path: string) => {
  try {
    rmSync(path, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`⚠️📄🗑️ Failed to delete file: ${path}`, error);
    return false;
  }
};
