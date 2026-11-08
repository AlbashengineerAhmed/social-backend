/**
 * @fileoverview Post Business Logic and Service Layer
 * @module modules/post/service/post.service
 * @description Provides business operations for posts including paginated newsfeed retrieval,
 * deep comment/reply population, cloud media uploads, ownership-restricted updates, soft deletion,
 * restoration, like/unlike reactions, repost/quote-repost sharing, hiding, and saved bookmarks.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { postModel, postTypeCategories, postPrivacyTypes } from "../../../DB/model/Post.model.js";
import { savedPostModel } from "../../../DB/model/SavedPost.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { paginate } from "../../../utils/pagination.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { notificationTypes } from "../../../DB/model/Notification.model.js";
import { groupModel } from "../../../DB/model/Group.model.js";
import { groupMemberModel } from "../../../DB/model/GroupMember.model.js";

/**
 * Sanitizes a post's originalPost reference when shared.
 * If the original post has been soft-deleted or changed to 'only_me',
 * returns a safe placeholder without crashing or leaking private data.
 */
export const sanitizePostWithOriginal = (post, viewerId) => {
    if (!post) return post;
    const postObj = post.toObject ? post.toObject() : { ...post };

    if (postObj.originalPost) {
        const orig = postObj.originalPost;
        const origDeleted = orig.isDeleted;
        const origOnlyMe = orig.privacy === postPrivacyTypes.only_me;
        const origOwnerId = orig.createdBy?._id?.toString() || orig.createdBy?.toString();
        const viewerIdStr = viewerId?.toString();

        if (origDeleted) {
            postObj.originalPost = {
                _id: orig._id,
                isUnavailable: true,
                message: "This post is unavailable or has been removed."
            };
        } else if (origOnlyMe && origOwnerId !== viewerIdStr) {
            postObj.originalPost = {
                _id: orig._id,
                isUnavailable: true,
                message: "This post is private."
            };
        }
    }
    return postObj;
};

/**
 * Common population config for posts, including original post details and comments
 */
export const postFullPopulate = [
    {
        path: "createdBy",
        select: "username image firstName lastName role"
    },
    {
        path: "groupId",
        select: "name slug avatar cover privacy membersCount category description creator"
    },
    {
        path: "originalPost",
        populate: [
            {
                path: "createdBy",
                select: "username image firstName lastName role"
            },
            {
                path: "groupId",
                select: "name slug avatar cover privacy membersCount category description creator"
            }
        ]
    },
    {
        path: "comments",
        match: { commentId: { $exists: false }, isDeleted: { $exists: false } },
        populate: [
            {
                path: "createdBy",
                select: "username image"
            },
            {
                path: "reply",
                match: { isDeleted: { $exists: false } },
                populate: [
                    {
                        path: "createdBy",
                        select: "username image"
                    }
                ]
            }
        ]
    }
];

/**
 * Retrieve paginated active posts with populated authors, top-level comments, and nested replies.
 * @route GET /post
 */
export const getPosts = asyncHandler(async (req, res, next) => {
    const { page, size, limit } = req.query;
    const filter = { isDeleted: { $exists: false } };

    if (req.user?._id) {
        filter.hiddenBy = { $ne: req.user._id };
    }

    const data = await paginate({
        page,
        size: size || limit,
        model: postModel,
        filter,
        sort: { createdAt: -1 },
        populate: postFullPopulate
    });

    if (data?.data?.length) {
        data.data = data.data.map(p => sanitizePostWithOriginal(p, req.user?._id));
    }
    data.posts = data.data || [];

    return successResponse({ res, status: 200, data });
});

/**
 * Create and publish a new post with optional Cloudinary image/video attachments.
 * @route POST /post
 */
export const createPost = asyncHandler(async (req, res, next) => {
    const { content, privacy, groupId } = req.body;
    let attachments = [];
    if (req.files?.length) {
        for (const file of req.files) {
            const isVideo = file.mimetype?.startsWith('video');
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME || 'Social Media App'}/post`,
                resource_type: isVideo ? "video" : "auto"
            });
            attachments.push({ secure_url, public_id });
        }
    }

    const post = await dbService.create({
        model: postModel,
        data: {
            content,
            attachments,
            privacy: privacy || postPrivacyTypes.public,
            groupId: groupId || undefined,
            createdBy: req.user._id
        }
    });

    // Populate createdBy so returned post has full author data
    await post.populate({
        path: "createdBy",
        select: "username image firstName lastName role"
    });

    return successResponse({ res, status: 201, data: { post } });
});

/**
 * Update an existing post owned by the authenticated user.
 * @route PATCH /post/:postId
 */
export const updatePost = asyncHandler(async (req, res, next) => {
    let attachments = [];
    if (req.files?.length) {
        for (const file of req.files) {
            const isVideo = file.mimetype?.startsWith('video');
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME || 'Social Media App'}/post`,
                resource_type: isVideo ? "video" : "auto"
            });
            attachments.push({ secure_url, public_id });
        }
        req.body.attachments = attachments;
    }

    const post = await dbService.findOneAndUpdate({
        model: postModel,
        filter: { _id: req.params.postId, isDeleted: { $exists: false }, createdBy: req.user._id },
        data: {
            ...req.body,
            updatedBy: req.user._id
        },
        options: {
            new: true
        }
    });

    return post
        ? successResponse({ res, status: 200, data: { post } })
        : next(new Error("post not found", { cause: 404 }));
});

/**
 * Soft-delete (freeze) an active post.
 * Allowed for: post author, platform admin, or group owner/admin if post is inside a group.
 * @route PATCH /post/:postId/freeze
 */
export const freezePost = asyncHandler(async (req, res, next) => {
    const post = await postModel.findOne({
        _id: req.params.postId,
        isDeleted: { $exists: false }
    });

    if (!post) {
        return next(new Error("Post not found or already deleted", { cause: 404 }));
    }

    const isAuthor = post.createdBy.toString() === req.user._id.toString();
    const isPlatformAdmin = req.user.role === "admin" || req.user.role === "superAdmin";

    let isGroupModerator = false;
    if (post.groupId) {
        const group = await groupModel.findById(post.groupId);
        if (group && group.creator?.toString() === req.user._id.toString()) {
            isGroupModerator = true;
        } else {
            const member = await groupMemberModel.findOne({
                groupId: post.groupId,
                userId: req.user._id,
                status: "active",
                role: { $in: ["owner", "admin", "moderator"] }
            });
            if (member) isGroupModerator = true;
        }
    }

    if (!isAuthor && !isPlatformAdmin && !isGroupModerator) {
        return next(new Error("You are not authorized to delete this post", { cause: 403 }));
    }

    post.isDeleted = Date.now();
    post.deletedBy = req.user._id;
    await post.save();

    // If it was a group post, decrement group post count
    if (post.groupId) {
        await groupModel.updateOne({ _id: post.groupId }, { $inc: { postsCount: -1 } });
    }

    return successResponse({ res, status: 200, data: { post } });
});

/**
 * Restore (unfreeze) a previously soft-deleted post.
 * @route PATCH /post/:postId/un-freeze
 */
export const unfreezePost = asyncHandler(async (req, res, next) => {
    const post = await dbService.findOneAndUpdate({
        model: postModel,
        filter: {
            _id: req.params.postId,
            isDeleted: { $exists: true },
            deletedBy: req.user._id
        },
        data: {
            $unset: {
                isDeleted: 0,
                deletedBy: 0
            }
        },
        options: {
            new: true
        }
    });

    return post
        ? successResponse({ res, status: 200, data: { post } })
        : next(new Error("post not found", { cause: 404 }));
});

/**
 * Toggle like/unlike reaction on a post.
 * Uses atomic MongoDB operations: $pull for unLike and $addToSet for like.
 * @route PATCH /post/:postId/like
 */
export const likePost = asyncHandler(async (req, res, next) => {
    const { action } = req.query;
    const data = action?.toLowerCase() === 'unlike'
        ? { $pull: { likes: req.user._id } }
        : { $addToSet: { likes: req.user._id } };

    const post = await dbService.findOneAndUpdate({
        model: postModel,
        filter: {
            _id: req.params.postId,
            isDeleted: { $exists: false }
        },
        data,
        options: {
            new: true
        }
    });

    if (post && action?.toLowerCase() !== 'unlike') {
        const postAuthorId = post.userId || post.createdBy;
        if (postAuthorId && postAuthorId.toString() !== req.user._id.toString()) {
            try {
                await createNotification({
                    recipient: postAuthorId,
                    actor: req.user._id,
                    type: notificationTypes.like_post,
                    entityId: post._id,
                    entityType: 'Post',
                    message: `${req.user.username || 'Someone'} liked your post.`
                });
            } catch (err) {
                console.error('Failed to dispatch like notification:', err);
            }
        }
    }

    return post
        ? successResponse({ res, status: 200, data: { post } })
        : next(new Error("post not found", { cause: 404 }));
});

/**
 * Retrieve single canonical post by ID.
 * Supports public links, safe fallbacks if original post is deleted/private,
 * and canonical URL response.
 * @route GET /post/:postId
 */
export const getPostById = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await postModel.findOne({
        _id: postId,
        isDeleted: { $exists: false }
    }).populate(postFullPopulate);

    if (!post) {
        return next(new Error("Post not found", { cause: 404 }));
    }

    const viewerId = req.user?._id;
    const authorId = post.createdBy?._id?.toString() || post.createdBy?.toString();

    // Check post privacy
    if (post.privacy === postPrivacyTypes.only_me && authorId !== viewerId?.toString()) {
        return next(new Error("You are not authorized to view this private post", { cause: 403 }));
    }

    const sanitized = sanitizePostWithOriginal(post, viewerId);
    const feUrl = process.env.FE_URL || "http://localhost:5173";
    const postUrl = `${feUrl}/post/${post._id}`;

    return successResponse({
        res,
        status: 200,
        data: {
            post: sanitized,
            canonicalUrl: postUrl
        }
    });
});

/**
 * Share a post as either a simple Repost or a Quote Repost.
 * Atomically increments shareCount on original post.
 * Enforces privacy, prevents duplicate multi-level chain bloat.
 * @route POST /post/share/:postId
 */
export const sharePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { content, postType, privacy, groupId } = req.body;

    const targetPost = await postModel.findOne({
        _id: postId,
        isDeleted: { $exists: false }
    });

    if (!targetPost) {
        return next(new Error("Target post not found or unavailable", { cause: 404 }));
    }

    // Disallow sharing private posts unless viewer is the creator
    if (targetPost.privacy === postPrivacyTypes.only_me && targetPost.createdBy.toString() !== req.user._id.toString()) {
        return next(new Error("Cannot share private post", { cause: 403 }));
    }

    // Flatten deep sharing chain: always reference the original root post
    const rootPostId = targetPost.originalPost || targetPost._id;

    const type = postType === postTypeCategories.quote ? postTypeCategories.quote : postTypeCategories.repost;

    const newPost = await postModel.create({
        postType: type,
        originalPost: rootPostId,
        content: content || "",
        privacy: privacy || postPrivacyTypes.public,
        groupId: groupId || undefined,
        createdBy: req.user._id
    });

    // Atomically increment shareCount on root post and target post
    await postModel.updateOne({ _id: rootPostId }, { $inc: { shareCount: 1 } });
    if (targetPost._id.toString() !== rootPostId.toString()) {
        await postModel.updateOne({ _id: targetPost._id }, { $inc: { shareCount: 1 } });
    }

    // Populate newly created shared post
    const populatedPost = await postModel.findById(newPost._id).populate(postFullPopulate);

    // Notify original post author
    const originalAuthorId = targetPost.createdBy?.toString();
    if (originalAuthorId && originalAuthorId !== req.user._id.toString()) {
        try {
            await createNotification({
                recipient: originalAuthorId,
                actor: req.user._id,
                type: notificationTypes.post_share,
                entityId: newPost._id,
                entityType: "Post",
                message: `${req.user.username || 'Someone'} shared your post.`
            });
        } catch (err) {
            console.error("Failed to dispatch share notification:", err);
        }
    }

    return successResponse({
        res,
        status: 201,
        message: type === postTypeCategories.quote ? "Post quoted successfully" : "Post reposted successfully",
        data: { post: sanitizePostWithOriginal(populatedPost, req.user._id) }
    });
});

/**
 * Hide a post from authenticated user's feed.
 * @route PATCH /post/:postId/hide
 */
export const hidePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    await postModel.updateOne(
        { _id: postId },
        { $addToSet: { hiddenBy: req.user._id } }
    );

    return successResponse({
        res,
        status: 200,
        message: "Post hidden from your feed"
    });
});

/**
 * Unhide a post from authenticated user's feed.
 * @route PATCH /post/:postId/unhide
 */
export const unhidePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    await postModel.updateOne(
        { _id: postId },
        { $pull: { hiddenBy: req.user._id } }
    );

    return successResponse({
        res,
        status: 200,
        message: "Post restored to your feed"
    });
});

/**
 * Retrieve paginated hidden posts for the authenticated user.
 * @route GET /post/hidden
 */
export const getHiddenPosts = asyncHandler(async (req, res, next) => {
    const { page, size, limit } = req.query;

    const data = await paginate({
        page,
        size: size || limit,
        model: postModel,
        filter: {
            hiddenBy: req.user._id,
            isDeleted: { $exists: false }
        },
        sort: { createdAt: -1 },
        populate: postFullPopulate
    });

    if (data?.posts?.length) {
        data.posts = data.posts.map(p => sanitizePostWithOriginal(p, req.user._id));
    }

    return successResponse({
        res,
        status: 200,
        data
    });
});

/**
 * Save / Bookmark a post.
 * Uses atomic upsert to prevent duplicate saves.
 * @route POST /post/:postId/save
 */
export const savePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await postModel.findOne({
        _id: postId,
        isDeleted: { $exists: false }
    });

    if (!post) {
        return next(new Error("Post not found", { cause: 404 }));
    }

    await savedPostModel.findOneAndUpdate(
        { userId: req.user._id, postId },
        { userId: req.user._id, postId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return successResponse({
        res,
        status: 200,
        message: "Post saved to your bookmarks"
    });
});

/**
 * Unsave / Remove bookmark for a post.
 * @route DELETE /post/:postId/save
 */
export const unsavePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    await savedPostModel.deleteOne({
        userId: req.user._id,
        postId
    });

    return successResponse({
        res,
        status: 200,
        message: "Post removed from your saved list"
    });
});

/**
 * Retrieve paginated saved posts for the authenticated user.
 * @route GET /post/saved
 */
export const getSavedPosts = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: savedPostModel,
        filter: { userId: req.user._id },
        populate: [
            {
                path: "postId",
                populate: postFullPopulate
            }
        ]
    });

    // Sanitize populated posts
    if (data?.data?.length) {
        data.posts = data.data
            .filter(item => item.postId)
            .map(item => ({
                ...item.toObject ? item.toObject() : item,
                post: sanitizePostWithOriginal(item.postId, req.user._id)
            }));
    } else {
        data.posts = [];
    }

    return successResponse({
        res,
        status: 200,
        data
    });
});
