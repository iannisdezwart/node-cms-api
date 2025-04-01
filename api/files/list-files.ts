import { RequestHandler } from "express";
import { Settings } from "../../settings";
import { readdirSync, statSync } from "fs";
import { filePathIsSafe } from "./utils/filepath-is-safe";
import { createHash } from "crypto";
import { resolve } from "path";

type FileInfo = {
  name: string;
  path: string;
  isDirectory: boolean;
  filesInside: number;
  size: number;
  modified: Date;
  hash: string;
};

export const listFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const { path } = req.body;

    // Validate input.
    if (!path) {
      res.status(400).json({ error: "Path is required" });
      return;
    }
    if (typeof path !== "string") {
      res.status(400).json({ error: "Path must be a string" });
      return;
    }
    if (!filePathIsSafe(settings, path)) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    // List files in the directory.
    const files: FileInfo[] = [];
    const directoryPath = `${settings.webroot}/content${path}`;
    const dir = readdirSync(directoryPath);
    for (const file of dir) {
      const stats = statSync(`${directoryPath}/${file}`);
      const hash = createHash("md5")
        .update(resolve(`${path}/${file}`))
        .digest("hex");

      files.push({
        name: file,
        path: `${path}/${file}`,
        isDirectory: stats.isDirectory(),
        filesInside: stats.isDirectory()
          ? readdirSync(`${directoryPath}/${file}`).length
          : 0,
        size: stats.isDirectory() ? 0 : stats.size,
        modified: stats.mtime,
        hash,
      });
    }

    // Send response.
    res.json({ files });
  };
