
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const uploadFolder = path.join(process.cwd(), "uploads");

// Create uploads folder if it does not exist
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configure where uploaded files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = crypto.randomUUID() + extension;

    cb(null, uniqueName);
  }
});

// Allow only PDF, JPG and PNG files
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png"
  };

  const extension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes[extension] !== file.mimetype) {
    return cb(
      new Error("Only PDF, JPG and PNG files are allowed.")
    );
  }

  cb(null, true);
};

// Configure Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export default upload;
