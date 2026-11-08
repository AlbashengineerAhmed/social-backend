/**
 * @fileoverview Post Management Router
 * @module modules/post/post.controller
 * @description Exposes endpoints for creating posts with attachments, updating posts,
 * freezing (soft deleting), restoring, liking/unliking, and paginating posts with populated comments.
 */

import * as postService from './service/post.service.js';
import * as validators from './post.validation.js';
import { validation } from '../../middleware/validation.middleware.js';
import { authentication, authorization, optionalAuthentication } from '../../middleware/auth.middleware.js';
import { endpoint } from './post.authorization.js';
import { Router } from "express";
import { fileValidations, uploadCloudFile } from '../../utils/multer/cloud.multer.js';
import commentRouter from '../comment/comment.controller.js';

const router = Router();

// Nested Router: Forward comment operations to comment controller
router.use("/:postId/comment", commentRouter);

// Route: Get saved / bookmarked posts
router.get("/saved", authentication(), postService.getSavedPosts);

// Route: Get hidden posts
router.get("/hidden", authentication(), postService.getHiddenPosts);

// Route: Unhide post
router.patch(
    "/:postId/unhide",
    authentication(),
    postService.unhidePost
);

// Route: Share post (Repost or Quote Repost)
router.post(
    "/share/:postId",
    authentication(),
    postService.sharePost
);

// Route: Hide post from feed
router.patch(
    "/:postId/hide",
    authentication(),
    postService.hidePost
);

// Route: Bookmark / Save post
router.post(
    "/:postId/save",
    authentication(),
    postService.savePost
);

// Route: Remove bookmark / Unsave post
router.delete(
    "/:postId/save",
    authentication(),
    postService.unsavePost
);

// Route: Create new post with optional file attachments
router.post(
    "/",
    authentication(),
    authorization(endpoint.createPost),
    uploadCloudFile(fileValidations.media).array('attachments', 2),
    validation(validators.createPost),
    postService.createPost
);

// Route: Update an existing post's content or attachments
router.patch(
    "/:postId",
    authentication(),
    authorization(endpoint.createPost),
    uploadCloudFile(fileValidations.media).array('attachments', 2),
    validation(validators.updatePost),
    postService.updatePost
);

// Route: Freeze / soft-delete a post
router.patch(
    "/:postId/freeze",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.freezePost),
    postService.freezePost
);

router.delete(
    "/:postId",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.freezePost),
    postService.freezePost
);

// Route: Restore / unfreeze a post
router.patch(
    "/:postId/restore",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.unfreezePost),
    postService.unfreezePost
);

// Route: Unfreeze alias
router.patch(
    "/:postId/unfreeze",
    authentication(),
    authorization(endpoint.freezePost),
    validation(validators.unfreezePost),
    postService.unfreezePost
);

// Route: Like or unlike a post (?action=like | ?action=unLike)
router.patch(
    "/:postId/like",
    authentication(),
    authorization(endpoint.createPost),
    validation(validators.likePost),
    postService.likePost
);

// Route: Get canonical post by ID (with safe originalPost fallback and permanent URL)
router.get("/:postId", optionalAuthentication(), postService.getPostById);

// Route: Paginate posts with nested comments and replies
router.get("/", optionalAuthentication(), postService.getPosts);

export default router;
