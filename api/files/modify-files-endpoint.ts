import { RequestHandler } from "express";
import { Settings } from "../../settings.js";
import { modifyMultipleFiles } from "./utils/modify-multiple-files.js";
import { modifySingleFile } from "./utils/modify-single-file.js";

export const modifyFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const { mode } = req.body;

    // Validate input.
    if (mode === undefined) {
      res.status(400).json({ error: "Mode is required" });
      return;
    }
    if (typeof mode !== "string") {
      res.status(400).json({ error: "Mode must be a string" });
      return;
    }

    switch (mode) {
      case "copy-single":
        modifySingleFile(settings, "copy", req, res);
        return;
      case "copy-multiple":
        modifyMultipleFiles(settings, "copy", req, res);
        return;
      case "move-single":
        modifySingleFile(settings, "move", req, res);
        return;
      case "move-multiple":
        modifyMultipleFiles(settings, "move", req, res);
        return;
    }

    res.status(400).json({ error: "Unknown mode" });
  };
