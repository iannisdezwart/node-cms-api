import { RequestHandler } from "express";
import { existsSync, renameSync } from "fs";
import { filePathIsSafe } from "./utils/filepath-is-safe";
import { Settings } from "../../settings";
import { updateThumbnailCache } from "../../utils/update-thumbnail-cache";

export const uploadFilesEndpoint =
  (settings: Settings): RequestHandler =>
  (req, res) => {
    const files = req.files;
    const { path } = req.body;

    // Validate input.
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }
    if (typeof path !== "string") {
      res.status(400).json({ error: "Path must be a string" });
      return;
    }

    // Process files.
    for (const file of files) {
      let i = 0;
      const extSeparator = file.originalname.lastIndexOf(".");
      let filename: string;
      let ext: string;
      if (extSeparator === -1) {
        filename = file.originalname;
        ext = "";
      } else {
        filename = file.originalname.slice(0, extSeparator);
        ext = file.originalname.slice(extSeparator);
      }

      while (true) {
        const fileinameCandidate = `${filename}${i > 0 ? `-${i}` : ""}${ext}`;
        const filePath = `${settings.webroot}/content/${path}/${fileinameCandidate}`;
        if (!filePathIsSafe(settings, filePath)) {
          res.status(400).json({ error: "Invalid file path" });
          return;
        }
        if (existsSync(filePath)) {
          i++;
          continue;
        }

        renameSync(file.path, filePath);
      }
    }

    updateThumbnailCache(settings);

    // Send response.
    res.json({ message: "Files uploaded successfully" });
  };
