import { execFile } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import { join, resolve } from "path";
import { promisify } from "util";
import { Settings } from "../../../settings.js";

const imageExtensions = [
  "jpeg",
  "jpg",
  "gif",
  "png",
  "apng",
  "svg",
  "bmp",
  "ico",
  "webp",
];

const isImage = (path: string) => {
  const extIdx = path.lastIndexOf(".");
  if (extIdx === -1) {
    return false;
  }
  const ext = path.slice(extIdx + 1).toLowerCase();
  return imageExtensions.includes(ext);
};

const createThumbnail = async (settings: Settings, relativeImgPath: string) => {
  const hash = createHash("md5")
    .update(join("/", relativeImgPath))
    .digest("hex");

  const thumbnailsDir = resolve(join(settings.webroot, "thumbnails"));
  const thumbnailPath = join(thumbnailsDir, `${hash}.png`);
  if (fs.existsSync(thumbnailPath)) {
    return;
  }

  const inputPath = resolve(join(settings.webroot, "content", relativeImgPath));
  const args = [
    inputPath,
    "-strip",
    "-interlace",
    "Plane",
    "-sampling-factor",
    "4:2:0",
    "-quality",
    "80",
    "-resize",
    "64x64>",
  ];

  try {
    await promisify(execFile)("magick", [...args, thumbnailPath]);
  } catch (err) {
    console.error(`Error creating thumbnmail for "${inputPath}":\n${err}`);
    throw err;
  }
};

const createThumbnailHelper = async (settings: Settings, relativePath = "") => {
  const contentDir = resolve(join(settings.webroot, "content"));
  const dirPath = join(contentDir, relativePath);
  const files = await fs.promises.readdir(dirPath);
  for (const file of files) {
    const filePath = join(dirPath, file);
    const relativeFilePath = join(relativePath, file);
    if (fs.statSync(filePath).isDirectory()) {
      createThumbnailHelper(settings, relativeFilePath);
    } else if (isImage(file)) {
      await createThumbnail(settings, relativeFilePath);
    }
  }
};

export const updateThumbnailCache = (settings: Settings) => {
  const thumbnailsDir = resolve(join(settings.webroot, "thumbnails"));
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir);
  }

  createThumbnailHelper(settings);
};
