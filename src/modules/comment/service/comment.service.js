/**
 * @fileoverview Comment Service and Business Logic Layer
 * @module modules/comment/service/comment.service
 * @description Implements comment and nested reply creation, cloud attachment uploads,
 * comment updating, and soft-delete/restore operations with multi-tier authorization
 * (comment author, post owner, or system admin).
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { commentModel } from "../../../DB/model/Comment.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { roleTypes } from "../../../DB/model/User.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { notificationTypes } from "../../../DB/model/Notification.model.js";

/**
 * Create a new top-level comment or a nested reply to an existing comment.
 * Uploads any media attachments to Cloudinary under the organized directory hierarchy.
 * @route POST /post/:postId/comment or POST /post/:postId/comment/:commentId/reply
 * @param {import("express").Request} req Express request object containing route params, body, files, and user
 * @param {import("express").Response} res Express response object
 * @param {import("express").NextFunction} next Express next middleware function
 */
export const createComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    if (commentId && !await dbService.findOne({
        model: commentModel,
        filter: { _id: commentId, postId, isDeleted: { $exists: false } }
    })) {
        return next(new Error("In-valid parent comment", { cause: 404 }));
    }

    const post = await dbService.findOne({
        model: postModel,
        filter: { _id: postId, isDeleted: { $exists: false } }
    });

    if (!post) {
        return next(new Error("In-valid post Id", { cause: 404 }));
    }

    if (req.files?.length) {
        const attachments = [];
        for (const file of req.files) {
            const isVideo = file.mimetype?.startsWith('video');
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME || 'Social Media App'}/user/${post.createdBy}/post/${postId}/comment`,
                resource_type: isVideo ? "video" : "auto"
            });
            attachments.push({ secure_url, public_id });
        }
        req.body.attachments = attachments;
    }

    const comment = await dbService.create({
        model: commentModel,
        data: {
            ...req.body,
            postId,
            commentId,
            createdBy: req.user._id
        }
    });

    // Notify post owner of new comment
    const postOwner = post.createdBy || post.userId;
    if (postOwner && postOwner.toString() !== req.user._id.toString()) {
        try {
            await createNotification({
                recipient: postOwner,
                actor: req.user._id,
                type: notificationTypes.comment,
                entityId: post._id,
                entityType: 'Post',
                message: `${req.user.username || 'Someone'} commented on your post: "${(req.body.content || '').slice(0, 30)}..."`
            });
        } catch (err) {
            console.error('Failed to dispatch comment notification:', err);
        }
    }

    return successResponse({ res, status: 201, data: { comment } });
});

/**
 * Update an existing comment's text and/or media attachments. Only the original author is permitted.
 * @route PATCH /post/:postId/comment/:commentId
 * @param {import("express").Request} req Express request object containing commentId, postId, body, files, and user
 * @param {import("express").Response} res Express response object
 * @param {import("express").NextFunction} next Express next middleware function
 */
export const updateComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    const comment = await dbService.findOne({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            createdBy: req.user._id,
            isDeleted: { $exists: false }
        }
    });

    if (!comment) {
        return next(new Error("In-valid comment Id or not auth user", { cause: 404 }));
    }

    if (req.files?.length) {
        const attachments = [];
        for (const file of req.files) {
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME}/user/${comment.createdBy}/post/${postId}/comment`
            });
            attachments.push({ secure_url, public_id });
        }
        req.body.attachments = attachments;
    }

    const updatedComment = await dbService.findOneAndUpdate({
        model: commentModel,
        filter: { _id: commentId },
        data: {
            ...req.body,
            updatedBy: req.user._id
        },
        options: { new: true }
    });

    return successResponse({ res, status: 200, data: { comment: updatedComment } });
});

/**
 * Freeze (soft-delete) a comment. Permitted for comment author, the post owner, or system admin.
 * @route PATCH /post/:postId/comment/:commentId/freeze
 * @param {import("express").Request} req Express request object containing commentId, postId, and user
 * @param {import("express").Response} res Express response object
 * @param {import("express").NextFunction} next Express next middleware function
 */
export const freezeComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    const comment = await dbService.findOne({
        model: commentModel,
        filter: { _id: commentId, postId, isDeleted: { $exists: false } },
        populate: [{ path: "postId" }]
    });

    if (
        !comment ||
        (
            comment.createdBy.toString() != req.user._id.toString() &&
            comment.postId.createdBy.toString() != req.user._id.toString() &&
            req.user.role != roleTypes.admin
        )
    ) {
        return next(new Error("In-valid comment Id or not auth user", { cause: 404 }));
    }

    const savedComment = await dbService.findOneAndUpdate({
        model: commentModel,
        filter: { _id: commentId },
        data: {
            isDeleted: Date.now(),
            deletedBy: req.user._id
        },
        options: { new: true }
    });

    return successResponse({ res, status: 200, data: { comment: savedComment } });
});

/**
 * Unfreeze (restore) a previously frozen comment. Permitted for comment author, the post owner, or system admin.
 * @route PATCH /post/:postId/comment/:commentId/un-freeze
 * @param {import("express").Request} req Express request object containing commentId, postId, and user
 * @param {import("express").Response} res Express response object
 * @param {import("express").NextFunction} next Express next middleware function
 */
export const unFreezeComment = asyncHandler(async (req, res, next) => {
    const { postId, commentId } = req.params;

    const comment = await dbService.findOne({
        model: commentModel,
        filter: {
            _id: commentId,
            postId,
            isDeleted: { $exists: true }
        },
        populate: [{ path: "postId" }]
    });

    if (
        !comment ||
        (
            comment.createdBy.toString() != req.user._id.toString() &&
            comment.postId.createdBy.toString() != req.user._id.toString() &&
            req.user.role != roleTypes.admin
        )
    ) {
        return next(new Error("In-valid comment Id or not auth user", { cause: 404 }));
    }

    const savedComment = await dbService.findOneAndUpdate({
        model: commentModel,
        filter: { _id: commentId },
        data: {
            $unset: { isDeleted: 0, deletedBy: 0 }
        },
        options: { new: true }
    });

    return successResponse({ res, status: 200, data: { comment: savedComment } });
});

/**
 * Alias for unFreezeComment to support camelCase and case variations.
 */
export const unfreezeComment = unFreezeComment;
