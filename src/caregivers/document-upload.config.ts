import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

export const DOCUMENT_UPLOAD_DIR = './uploads/documents';
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

if (!fs.existsSync(DOCUMENT_UPLOAD_DIR)) {
  fs.mkdirSync(DOCUMENT_UPLOAD_DIR, { recursive: true });
}

export const documentFilename = (
  _req: unknown,
  file: { originalname: string },
  callback: (error: Error | null, filename: string) => void,
) => {
  const ext = extname(file.originalname);
  callback(null, `${randomUUID()}${ext}`);
};

export const documentFileFilter = (
  _req: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        'Invalid file type. Only PDF, JPEG, and PNG files are allowed',
      ),
      false,
    );
  }
  callback(null, true);
};

export const multerOptions = {
  storage: diskStorage({
    destination: DOCUMENT_UPLOAD_DIR,
    filename: documentFilename,
  }),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
  },
  fileFilter: documentFileFilter,
};
