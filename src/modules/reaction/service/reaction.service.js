/**
 * @fileoverview Reaction Business Logic Service
 * @module modules/reaction/service/reaction.service
 * @description Reusable reaction service supporting posts and comments.
 * Uses upsert to handle both creation and reaction-type changes.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { reactionModel, targetTypes } from "../../../DB/model/Reaction.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { commentModel } from "../../../DB/model/Comment.model.js";
import { paginate } from "../../../utils/pagination.js";

/**
 * React to a post. Creates or updates the user's reaction.
 * @route POST /reaction/post/:postId
 */
export const reactToPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { type } = req.body;

    const post = await dbService.findOne({
        model: postModel,
        filter: { _id: postId, isDeleted: { $exists: false } }
    });
    if (!post) return next(new Error("Post not found", { cause: 404 }));

    // Upsert: create if not exists, update type if exists
    const reaction = await reactionModel.findOneAndUpdate(
        { userId: req.user._id, targetType: targetTypes.Post, targetId: postId },
        { type },
        { upsert: true, new: true }
    );

    return successResponse({ res, status: 200, data: { reaction } });
});

/**
 * Remove a reaction from a post.
 * @route DELETE /reaction/post/:postId
 */
export const removePostReaction = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const reaction = await dbService.findOneAndDelete({
        model: reactionModel,
        filter: { userId: req.user._id, targetType: targetTypes.Post, targetId: postId }
    });

    if (!reaction) return next(new Error("Reaction not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

/**
 * React to a comment. Creates or updates the user's reaction.
 * @route POST /reaction/comment/:commentId
 */
export const reactToComment = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;
    const { type } = req.body;

    const comment = await dbService.findOne({
        model: commentModel,
        filter: { _id: commentId, isDeleted: { $exists: false } }
    });
    if (!comment) return next(new Error("Comment not found", { cause: 404 }));

    const reaction = await reactionModel.findOneAndUpdate(
        { userId: req.user._id, targetType: targetTypes.Comment, targetId: commentId },
        { type },
        { upsert: true, new: true }
    );

    return successResponse({ res, status: 200, data: { reaction } });
});

/**
 * Remove a reaction from a comment.
 * @route DELETE /reaction/comment/:commentId
 */
export const removeCommentReaction = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;

    const reaction = await dbService.findOneAndDelete({
        model: reactionModel,
        filter: { userId: req.user._id, targetType: targetTypes.Comment, targetId: commentId }
    });

    if (!reaction) return next(new Error("Reaction not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

/**
 * Get paginated reactions for a post.
 * @route GET /reaction/post/:postId
 */
export const getPostReactions = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { page, size, type } = req.query;

    const filter = { targetType: targetTypes.Post, targetId: postId };
    if (type) filter.type = type;

    const data = await paginate({
        page,
        size,
        model: reactionModel,
        filter,
        populate: [{ path: 'userId', select: 'username image' }]
    });

    // Reaction counts by type
    const counts = await reactionModel.aggregate([
        { $match: { targetType: targetTypes.Post, targetId: postId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return successResponse({ res, data: { ...data, counts } });
});

/**
 * Get paginated reactions for a comment.
 * @route GET /reaction/comment/:commentId
 */
export const getCommentReactions = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;
    const { page, size, type } = req.query;

    const filter = { targetType: targetTypes.Comment, targetId: commentId };
    if (type) filter.type = type;

    const data = await paginate({
        page,
        size,
        model: reactionModel,
        filter,
        populate: [{ path: 'userId', select: 'username image' }]
    });

    const counts = await reactionModel.aggregate([
        { $match: { targetType: targetTypes.Comment, targetId: commentId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    return successResponse({ res, data: { ...data, counts } });
});

// -------------------------
// Saved Posts
// -------------------------
import { savedPostModel } from "../../../DB/model/SavedPost.model.js";

/**
 * Save a post to the authenticated user's saved collection.
 * @route POST /reaction/saved/:postId
 */
export const savePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await dbService.findOne({
        model: postModel,
        filter: { _id: postId, isDeleted: { $exists: false } }
    });
    if (!post) return next(new Error("Post not found", { cause: 404 }));

    const existing = await dbService.findOne({
        model: savedPostModel,
        filter: { userId: req.user._id, postId }
    });
    if (existing) return next(new Error("Post already saved", { cause: 409 }));

    const saved = await dbService.create({
        model: savedPostModel,
        data: { userId: req.user._id, postId }
    });

    return successResponse({ res, status: 201, data: { saved } });
});

/**
 * Remove a post from saved collection.
 * @route DELETE /reaction/saved/:postId
 */
export const unsavePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const saved = await dbService.findOneAndDelete({
        model: savedPostModel,
        filter: { userId: req.user._id, postId }
    });

    if (!saved) return next(new Error("Saved post not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

/**
 * Get paginated saved posts for authenticated user.
 * @route GET /reaction/saved
 */
export const getSavedPosts = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: savedPostModel,
        filter: { userId: req.user._id },
        populate: [{
            path: 'postId',
            populate: [{ path: 'createdBy', select: 'username image' }]
        }]
    });

    return successResponse({ res, data });
});

