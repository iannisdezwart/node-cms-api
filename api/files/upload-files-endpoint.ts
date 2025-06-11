import { RequestHandler } from "express";
import { renameSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../../settings.js";
import { filePathInContentDir } from "./utils/filepath-is-safe.js";
import { findNonConflictingPath } from "./utils/find-non-conflicting-path.js";
import { updateThumbnailCache } from "./utils/update-thumbnail-cache.js";

export const uploadFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const files = req.files;
    let { path } = req.body;

    // Validate input.
    if (files === undefined || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }
    if (typeof path !== "string") {
      res.status(400).json({ error: "Path must be a string" });
      return;
    }
    path = resolve(join(settings.webroot, "content", path));
    if (!filePathInContentDir(settings, path)) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    // Process files.
    const resolvedSources = [];
    const resolvedDestinations = [];
    for (const file of files) {
      const nonConflictingPathRes = findNonConflictingPath(
        settings,
        file.originalname,
        path,
        false
      );
      if (nonConflictingPathRes.ok === false) {
        res.status(400).json({ error: nonConflictingPathRes.reason });
        cleanup(files);
        return;
      }

      resolvedSources.push(file.path);
      resolvedDestinations.push(nonConflictingPathRes.path);
    }

    for (let i = 0; i < resolvedSources.length; i++) {
      const sourcePath = resolvedSources[i];
      const destinationFilePath = resolvedDestinations[i];
      renameSync(sourcePath, destinationFilePath);
    }

    updateThumbnailCache(settings);

    // Send response.
    res.json({ message: "Files uploaded successfully" });
  };

const cleanup = (files: Express.Multer.File[]) => {
  for (const file of files) {
    try {
      unlinkSync(file.path);
    } catch (error) {
      console.error(
        `⚠️📄🗑️ Failed to delete uploaded file: ${file.path}`,
        error
      );
    }
  }
};
