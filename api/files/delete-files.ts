import { RequestHandler } from "express";
import { Settings } from "../../settings";
import { filePathIsSafe } from "./utils/filepath-is-safe";
import { rmSync } from "fs";
import { updateThumbnailCache } from "./utils/update-thumbnail-cache";

export const deleteFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const { paths } = req.body;

    // Validate input.
    if (!paths || !Array.isArray(paths)) {
      res.status(400).json({ error: "Paths must be an array" });
      return;
    }
    if (paths.length === 0) {
      res.status(400).json({ error: "No paths provided" });
      return;
    }
    for (const path of paths) {
      if (typeof path !== "string") {
        res.status(400).json({ error: "Path must be a string" });
        return;
      }
      if (!filePathIsSafe(settings, path)) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }
    }

    // Delete files.
    for (const path of paths) {
      if (!deleteFile(settings, path)) {
        res.status(500).json({ error: `Failed to delete file: ${path}` });
        return;
      }
    }

    updateThumbnailCache(settings);

    // Send response.
    res.json({ message: "Files deleted successfully" });
  };

const deleteFile = (settings: Settings, path: string) => {
  const filePath = `${settings.webroot}/content${path}`;
  try {
    rmSync(filePath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`⚠️📄🗑️ Failed to delete file: ${filePath}`, error);
    return false;
  }
};
