/**
 * @fileoverview Cloudinary Multer Upload Middleware Factory
 * @module utils/multer/cloud.multer
 * @description Creates Multer instances using disk temporary storage and mime-type filters
 * preparing files for onward streaming/upload to Cloudinary.
 */

import multer from "multer";

/**
 * Common allowed MIME types for uploads
 */
export const fileValidations = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/mkv'],
    media: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/mkv'],
    document: ['application/pdf', 'application/msword']
};

/**
 * Creates a Multer upload middleware instance for cloud storage.
 * @param {Array<string>} [fileValidation=[]] - List of allowed MIME types
 * @returns {import('multer').Multer} Multer upload instance
 */
export const uploadCloudFile = (fileValidation = []) => {
    const storage = multer.diskStorage({});

    function fileFilter(req, file, cb) {
        if (fileValidation.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("In-valid file format"), false);
        }
    }

    return multer({ dest: 'tempPath', fileFilter, storage });
};

export const uploadCloud = uploadCloudFile;
