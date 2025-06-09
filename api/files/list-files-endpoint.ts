import { createHash } from "crypto";
import { RequestHandler } from "express";
import { readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../../settings.js";
import { filePathIsSafe } from "./utils/filepath-is-safe.js";

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
    let path = decodeURIComponent(req.params[0]);

    // Validate input.
    if (path === undefined) {
      res.status(400).json({ error: "Path is required" });
      return;
    }
    if (typeof path !== "string") {
      res.status(400).json({ error: "Path must be a string" });
      return;
    }
    const resolvedPath = resolve(join(settings.webroot, "content", path));
    if (!filePathIsSafe(settings, resolvedPath)) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    // List files in the directory.
    const files: FileInfo[] = [];
    const dir = readdirSync(resolvedPath);
    for (const file of dir) {
      const filePath = join(resolvedPath, file);
      const stats = statSync(filePath);
      const hash = createHash("md5").update(join(path, file)).digest("hex");

      files.push({
        name: file,
        path: join(path, file),
        isDirectory: stats.isDirectory(),
        filesInside: stats.isDirectory()? readdirSync(filePath).length : 0,
        size: stats.isDirectory() ? 0 : stats.size,
        modified: stats.mtime,
        hash,
      });
    }

    // Send response.
    res.json({ files });
  };
