/**
 * @fileoverview Local Disk Storage Multer Upload Middleware Factory
 * @module utils/multer/local.multer
 * @description Manages local server disk uploads with automatic directory creation,
 * unique nanoid prefixing, and MIME-type validation.
 */

import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { customAlphabet } from "nanoid";

/**
 * Creates a Multer upload middleware instance for local disk storage.
 * @param {Object} options
 * @param {string} [options.customPath="general"] - Relative folder path inside uploads/
 * @param {Array<string>} [options.fileValidation=[]] - List of allowed MIME types
 * @returns {import('multer').Multer} Multer upload instance
 */
export const uploadDiskFile = (customPath = "general", fileValidation = []) => {
    const basePath = `uploads/${customPath}`;
    const fullPath = path.resolve(`./src/${basePath}`);

    // Create directory recursively if it doesn't exist
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = customAlphabet("1234567890abcdef", 4)();
            file.finalPath = `${basePath}/${uniqueSuffix}_${file.originalname}`;
            cb(null, `${uniqueSuffix}_${file.originalname}`);
        }
    });

    function fileFilter(req, file, cb) {
        if (fileValidation.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("In-valid file format"), false);
        }
    }

    return multer({ dest: 'tempPath', fileFilter, storage });
};
