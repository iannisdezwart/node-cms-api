import { Request, Response } from "express";
import { cpSync, renameSync } from "fs";
import { join, parse, resolve } from "path";
import { Settings } from "../../../settings.js";
import { filePathIsSafe } from "./filepath-is-safe.js";
import { updateThumbnailCache } from "./update-thumbnail-cache.js";
import { findNonConflictingPath } from "./find-non-conflicting-path.js";

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
  const destinationPath = resolve(
    join(settings.webroot, "content", destination)
  );
  if (!filePathIsSafe(settings, destinationPath)) {
    res.status(400).json({ error: "Invalid destination path" });
    return;
  }

  // Modify files.
  const resolvedSources = [];
  const resolvedDestinations = [];
  for (const source of sources as string[]) {
    const resolvedSource = resolve(join(settings.webroot, "content", source));
    if (parse(resolvedSource).dir == destinationPath) {
      res.status(400).json({ error: "Source and destination are the same" });
      return;
    }
    const nonConflictingPathRes = findNonConflictingPath(
      settings,
      resolvedSource,
      destinationPath
    );
    if (!nonConflictingPathRes.ok) {
      res.status(400).json({ error: nonConflictingPathRes.reason });
      return;
    }
    resolvedSources.push(resolvedSource);
    resolvedDestinations.push(nonConflictingPathRes.path);
  }
  for (let i = 0; i < resolvedSources.length; i++) {
    const sourcePath = resolvedSources[i];
    const destinationFilePath = resolvedDestinations[i];
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
