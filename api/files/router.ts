import { Router } from "express";
import multer, { diskStorage } from "multer";
import { Settings } from "../../settings";
import { modifyFilesEndpoint } from "./modify-files";
import { deleteFilesEndpoint } from "./delete-files";
import { listFilesEndpoint } from "./list-files";
import { makeDirectoryEndpoint } from "./make-directory";
import { uploadFilesEndpoint } from "./upload-files-endpoint";

export const filesRouter = (settings: Settings) => {
  const upload = multer({
    storage: diskStorage({
      destination: (_, __, cb) => cb(null, "./uploads/"),
      filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  });

  return Router()
    .get("/", listFilesEndpoint(settings))
    .post("/", upload.any(), uploadFilesEndpoint(settings))
    .delete("/", deleteFilesEndpoint(settings))
    .patch("/", modifyFilesEndpoint(settings))
    .post("/directory", makeDirectoryEndpoint(settings));
};
