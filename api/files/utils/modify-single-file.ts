import { Request, Response } from "express";
import { cpSync, renameSync } from "fs";
import { Settings } from "../../../settings";
import { filePathIsSafe } from "./filepath-is-safe";
import { updateThumbnailCache } from "./update-thumbnail-cache";

export const modifySingleFile = (
  settings: Settings,
  mode: "copy" | "move",
  req: Request,
  res: Response
) => {
  const { source, destination } = req.body;

  // Validate input.
  if (typeof source !== "string" || typeof destination !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const sourcePath = `${settings.webroot}/content${source}`;
  const destinationPath = `${settings.webroot}/content${destination}`;
  if (
    !filePathIsSafe(settings, sourcePath) ||
    !filePathIsSafe(settings, destinationPath)
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
