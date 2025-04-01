import { Request, Response } from "express";
import { cpSync, renameSync } from "fs";
import { resolve } from "path";
import { Settings } from "../../../settings";
import { updateThumbnailCache } from "../../../utils/update-thumbnail-cache";
import { filePathIsSafe } from "./filepath-is-safe";

export const modifyMultipleFiles = (
  settings: Settings,
  mode: "copy" | "move",
  req: Request,
  res: Response
) => {
  const { sources, destination } = req.body;

  // Validate input.
  if (!Array.isArray(sources) || typeof destination !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  if (sources.length === 0) {
    res.status(400).json({ error: "No sources provided" });
    return;
  }
  const destinationPath = resolve(`${settings.webroot}/content${destination}`);
  if (!filePathIsSafe(settings, destinationPath)) {
    res.status(400).json({ error: "Invalid destination path" });
    return;
  }

  // Modify files.
  for (const source of sources as string[]) {
    const sourcePath = resolve(`${settings.webroot}/content${source}`);
    const sourceFilename = source.slice(source.lastIndexOf("/") + 1);
    const destinationFilePath = resolve(`${destinationPath}/${sourceFilename}`);
    if (
      !filePathIsSafe(settings, sourcePath) ||
      !filePathIsSafe(settings, destinationFilePath)
    ) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }
    if (mode == "move") {
      renameSync(sourcePath, destinationFilePath);
    } else {
      cpSync(sourcePath, destinationFilePath, { recursive: true });
    }
  }

  updateThumbnailCache(settings);

  // Send response.
  res.json({ message: "Files copied successfully" });
};
