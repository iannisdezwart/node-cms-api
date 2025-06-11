import { RequestHandler } from "express";
import { mkdirSync } from "fs";
import { join, resolve } from "path";
import { Settings } from "../../settings.js";
import { filePathInContentDir } from "./utils/filepath-is-safe.js";

export const makeDirectoryEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    let { path } = req.body;

    // Validate input.
    if (path === undefined) {
      res.status(400).json({ error: "Path is required" });
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

    // Create the directory.
    mkdirSync(path);
    res.json({ message: "Directory created successfully" });
  };
