/**
 * @fileoverview Reaction & Saved Posts Router
 * @module modules/reaction/reaction.controller
 * @description Endpoints for reacting to posts/comments and managing saved posts.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./reaction.authorization.js";
import * as reactionService from "./service/reaction.service.js";
import * as validators from "./reaction.validation.js";
import { generalFields } from "../../middleware/validation.middleware.js";
import joi from "joi";

const router = Router();

// ---- Saved Posts ----
// Route: Save a post
router.post(
    "/saved/:postId",
    authentication(),
    authorization(endpoint.react),
    validation(joi.object({ postId: generalFields.id.required() })),
    reactionService.savePost
);

// Route: Unsave a post
router.delete(
    "/saved/:postId",
    authentication(),
    authorization(endpoint.react),
    validation(joi.object({ postId: generalFields.id.required() })),
    reactionService.unsavePost
);

// Route: Get saved posts
router.get(
    "/saved",
    authentication(),
    reactionService.getSavedPosts
);

// ---- Post Reactions ----
// Route: React to a post (create or update reaction)
router.post(
    "/post/:postId",
    authentication(),
    authorization(endpoint.react),
    validation(validators.reactToPost),
    reactionService.reactToPost
);

// Route: Remove reaction from post
router.delete(
    "/post/:postId",
    authentication(),
    authorization(endpoint.react),
    validation(joi.object({ postId: generalFields.id.required() })),
    reactionService.removePostReaction
);

// Route: Get reactions for a post
router.get(
    "/post/:postId",
    validation(joi.object({ postId: generalFields.id.required() })),
    reactionService.getPostReactions
);

// ---- Comment Reactions ----
// Route: React to a comment
router.post(
    "/comment/:commentId",
    authentication(),
    authorization(endpoint.react),
    validation(validators.reactToComment),
    reactionService.reactToComment
);

// Route: Remove reaction from comment
router.delete(
    "/comment/:commentId",
    authentication(),
    authorization(endpoint.react),
    validation(joi.object({ commentId: generalFields.id.required() })),
    reactionService.removeCommentReaction
);

// Route: Get reactions for a comment
router.get(
    "/comment/:commentId",
    validation(joi.object({ commentId: generalFields.id.required() })),
    reactionService.getCommentReactions
);

export default router;

