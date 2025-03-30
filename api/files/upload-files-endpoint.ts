import { RequestHandler } from "express";

export const uploadFilesEndpoint: RequestHandler = (req, res) => {
  const files = req.files;

  // Validate input.
  if (!files || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: "No files uploaded" });
    return;
  }

  // Process files.
  const fileNames = files.map((file: Express.Multer.File) => file.originalname);

  // Send response.
  res.json({ message: "Files uploaded successfully", files: fileNames });
  
};
