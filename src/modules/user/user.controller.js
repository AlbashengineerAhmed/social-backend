/**
 * @fileoverview User Management Router
 * @module modules/user/user.controller
 * @description Exposes endpoints for managing user profile details, profile pictures,
 * cover images, password updates, email changes, profile views, and admin role adjustments.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./user.authorization.js";
import * as userService from "./service/user.service.js";
import * as validators from "./user.validation.js";
import { fileValidations, uploadCloudFile } from "../../utils/multer/cloud.multer.js";

const router = Router();

// Route: Get authenticated user's profile details
router.get("/profile", authentication(), userService.getProfile);

// Route: Get another user's shared profile & record viewer visit
router.get("/profile/:profileId", validation(validators.shareProfile), authentication(), userService.shareProfile);

// Route: Update basic profile details (username, phone, address, DOB, gender)
router.patch("/profile", authentication(), validation(validators.updateProfile), userService.updateProfile);

// Route: Upload & update profile avatar on Cloudinary
router.patch("/profile/image", authentication(), uploadCloudFile(fileValidations.image).single("image"), validation(validators.profileImage), userService.updateProfileImage);

// Route: Upload & update profile cover images on Cloudinary
router.patch("/profile/cover", authentication(), uploadCloudFile(fileValidations.image).array("image", 5), userService.updateProfileCoverImage);

// Route: Request email change (dispatches OTPs to old and new emails)
router.patch("/profile/email", authentication(), validation(validators.updateEmail), userService.updateEmail);

// Route: Verify OTP codes and complete email change
router.patch("/profile/email/reset", authentication(), validation(validators.resetEmail), userService.resetEmail);

// Route: Get recommended users / who to follow
router.get("/suggestions", authentication(), userService.getSuggestions);
router.get("/all", authentication(), userService.getSuggestions);

// Route: Update user password
router.patch("/profile/password", authentication(), validation(validators.updatePassword), userService.updatePassword);

// Route: Admin / SuperAdmin dashboard viewing all users and posts
router.get("/dashboard", authentication(), authorization(endpoint.dashboard), userService.dashboard);

// Route: Admin / SuperAdmin change user roles
router.patch("/change-roles/:userId", authentication(), authorization(endpoint.changeRoles), validation(validators.changeRoles), userService.changeRoles);

export default router;
