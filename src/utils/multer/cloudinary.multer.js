/**
 * @fileoverview Cloudinary Client Configuration
 * @module utils/multer/cloudinary.multer
 * @description Initializes and exports the Cloudinary v2 SDK instance using credentials from .env.dev.
 */

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
    secure: true
});

export const cloud = cloudinary;
export default cloudinary;
