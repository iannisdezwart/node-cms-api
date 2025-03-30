import { Router } from "express";
import { uploadFilesEndpoint } from "./upload-files-endpoint";
import multer, { diskStorage } from "multer";

export const filesRouter = () => {
  const upload = multer({
    storage: diskStorage({
      destination: (_, __, cb) => cb(null, "./uploads/"),
      filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
    }),
  });

  return Router().post("/", upload.any(), uploadFilesEndpoint);
};
