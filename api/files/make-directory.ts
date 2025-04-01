import { RequestHandler } from "express";
import { Settings } from "../../settings";
import { filePathIsSafe } from "./utils/filepath-is-safe";
import { mkdirSync } from "fs";

export const makeDirectoryEndpoint =
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

    // Create the directory.
    mkdirSync(`${settings.webroot}/content${path}`);
    res.json({ message: "Directory created successfully" });
  };
