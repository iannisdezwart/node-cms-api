import { createHash } from "crypto";
import * as fs from "fs";
import * as graphicsMagick from "gm";
import { Settings } from "../settings";

const imageMagick = graphicsMagick.subClass({ imageMagick: true });

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

const createThumbnail = (settings: Settings, imagePath: string) => {
  const hash = createHash("md5").update(imagePath).digest("hex");

  if (fs.existsSync(`${settings.webroot}/thumbnails/${hash}.png`)) {
    return;
  }

  imageMagick(`${settings.webroot}/content/${imagePath}`)
    .resize(64, 64, ">")
    .quality(80)
    .strip()
    .write(`${settings.webroot}/thumbnails/${hash}.png`, (err) => {
      if (err) {
        console.log(err);
        return;
      }
    });
};

const createThumbnailHelper = (settings: Settings, relativePath = "") => {
  const dirPath = `${settings.webroot}/content/${relativePath}`;
  fs.readdir(dirPath, (_, files) => {
    for (const file of files) {
      if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
        createThumbnailHelper(settings, `${relativePath}/${file}`);
      } else if (isImage(file)) {
        createThumbnail(settings, `${relativePath}/${file}`);
      }
    }
  });
};

export const updateThumbnailCache = (settings: Settings) => {
  if (!fs.existsSync(`${settings.webroot}/thumbnails`)) {
    fs.mkdirSync(`${settings.webroot}/thumbnails`);
  }

  createThumbnailHelper(settings);
};
