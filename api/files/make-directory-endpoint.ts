import { RequestHandler } from "express";
import { mkdirSync } from "fs";
import { Settings } from "../../settings.js";
import { filePathIsSafe } from "./utils/filepath-is-safe.js";
import { join, resolve } from "path";

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
    if (!filePathIsSafe(settings, path)) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }

    // Create the directory.
    mkdirSync(path);
    res.json({ message: "Directory created successfully" });
  };
