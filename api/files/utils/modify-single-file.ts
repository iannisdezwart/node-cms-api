import { Request, Response } from "express";
import { cpSync, renameSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../../../settings.js";
import { filePathInContentDir } from "./filepath-is-safe.js";
import { updateThumbnailCache } from "./update-thumbnail-cache.js";

export const modifySingleFile = (
  settings: Settings,
  mode: "copy" | "move",
  req: Request,
  res: Response
) => {
  const { source, destination } = req.body;

  // Validate input.
  if (source === undefined || destination === undefined) {
    res.status(400).json({ error: "Source and destination are required" });
    return;
  }
  if (typeof source !== "string" || typeof destination !== "string") {
    res.status(400).json({ error: "Invalid input types" });
    return;
  }
  const sourcePath = resolve(join(settings.webroot, "content", source));
  const destinationPath = resolve(
    join(settings.webroot, "content", destination)
  );
  if (
    !filePathInContentDir(settings, sourcePath) ||
    !filePathInContentDir(settings, destinationPath)
  ) {
    res.status(400).json({ error: "Invalid file path" });
    return;
  }

  // Modify file.
  if (mode == "move") {
    renameSync(sourcePath, destinationPath);
  } else {
    cpSync(sourcePath, destinationPath, { recursive: true });
  }

  updateThumbnailCache(settings);

  // Send response.
  res.json({ message: "File copied successfully" });
};
