import { Router } from "express";
import multer, { diskStorage } from "multer";
import { Settings } from "../../settings.js";
import { deleteFilesEndpoint } from "./delete-files-endpoint.js";
import { listFilesEndpoint } from "./list-files-endpoint.js";
import { makeDirectoryEndpoint } from "./make-directory-endpoint.js";
import { modifyFilesEndpoint } from "./modify-files-endpoint.js";
import { uploadFilesEndpoint } from "./upload-files-endpoint.js";
import { tmpdir } from "os";

export const filesRouter = (settings: Settings): Router => {
  const upload = multer({
    storage: diskStorage({
      destination: (_, __, cb) => cb(null, tmpdir()),
      filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  });

  return Router()
    .get("/*", listFilesEndpoint(settings))
    .post("/", upload.any(), uploadFilesEndpoint(settings))
    .delete("/", deleteFilesEndpoint(settings))
    .patch("/", modifyFilesEndpoint(settings))
    .post("/directory", makeDirectoryEndpoint(settings));
};
