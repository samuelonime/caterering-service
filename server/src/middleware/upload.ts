import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || '../client/public/uploads';
const absoluteDir = path.resolve(uploadDir);

if (!fs.existsSync(absoluteDir)) {
  fs.mkdirSync(absoluteDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, absoluteDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
