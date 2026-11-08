/**
 * @fileoverview Follow Business Logic Service
 * @module modules/follow/service/follow.service
 * @description Handles follow/unfollow, block/unblock, and follow request management.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { followModel, followStatusTypes } from "../../../DB/model/Follow.model.js";
import { blockModel } from "../../../DB/model/Block.model.js";
import { userModel } from "../../../DB/model/User.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { paginate } from "../../../utils/pagination.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { notificationTypes } from "../../../DB/model/Notification.model.js";

/**
 * Follow a user. If the target has a private account, creates a pending follow request.
 * @route POST /follow/:userId
 */
export const followUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const followerId = req.user._id;

    if (userId.toString() === followerId.toString()) {
        return next(new Error("You cannot follow yourself", { cause: 400 }));
    }

    // Check if target user exists
    const targetUser = await dbService.findById({ model: userModel, id: userId });
    if (!targetUser || targetUser.isDeleted) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Check block status
    const isBlocked = await dbService.findOne({
        model: blockModel,
        filter: {
            $or: [
                { blocker: followerId, blocked: userId },
                { blocker: userId, blocked: followerId }
            ]
        }
    });
    if (isBlocked) {
        return next(new Error("Cannot follow this user", { cause: 403 }));
    }

    // Check if already following
    const existingFollow = await dbService.findOne({
        model: followModel,
        filter: { follower: followerId, following: userId }
    });
    if (existingFollow) {
        return next(new Error("Already following or request pending", { cause: 409 }));
    }

    const follow = await dbService.create({
        model: followModel,
        data: {
            follower: followerId,
            following: userId,
            status: followStatusTypes.accepted
        }
    });

    // Generate real notification for the followed user
    try {
        await createNotification({
            recipient: userId,
            actor: followerId,
            type: notificationTypes.follow,
            entityId: follow._id,
            entityType: 'Follow',
            message: `${req.user.username || 'Someone'} started following you.`
        });
    } catch (err) {
        console.error('Failed to create follow notification:', err);
    }

    return successResponse({ res, status: 201, data: { follow } });
});

/**
 * Unfollow a user or cancel a pending follow request.
 * @route DELETE /follow/:userId
 */
export const unfollowUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const follow = await dbService.findOneAndDelete({
        model: followModel,
        filter: { follower: req.user._id, following: userId }
    });

    if (!follow) {
        return next(new Error("Follow relationship not found", { cause: 404 }));
    }

    return successResponse({ res, data: {} });
});

/**
 * Get paginated followers list of a user.
 * @route GET /follow/:userId/followers
 */
export const getFollowers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: followModel,
        filter: { following: userId, status: followStatusTypes.accepted },
        populate: [{ path: 'follower', select: 'username image' }]
    });

    return successResponse({ res, data });
});

/**
 * Get paginated following list of a user.
 * @route GET /follow/:userId/following
 */
export const getFollowing = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: followModel,
        filter: { follower: userId, status: followStatusTypes.accepted },
        populate: [{ path: 'following', select: 'username image' }]
    });

    return successResponse({ res, data });
});

/**
 * Check if authenticated user follows the specified user.
 * @route GET /follow/:userId/status
 */
export const checkFollowStatus = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const follow = await dbService.findOne({
        model: followModel,
        filter: { follower: req.user._id, following: userId }
    });

    return successResponse({
        res,
        data: {
            isFollowing: !!follow,
            status: follow?.status || null
        }
    });
});

/**
 * Get followers and following counts for a user.
 * @route GET /follow/:userId/counts
 */
export const getFollowCounts = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const [followersCount, followingCount, postsCount] = await Promise.all([
        followModel.countDocuments({ following: userId, status: followStatusTypes.accepted }),
        followModel.countDocuments({ follower: userId, status: followStatusTypes.accepted }),
        postModel.countDocuments({ createdBy: userId, isDeleted: { $exists: false } })
    ]);

    return successResponse({ res, data: { followersCount, followingCount, postsCount } });
});

/**
 * Get pending follow requests for the authenticated user.
 * @route GET /follow/requests
 */
export const getFollowRequests = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: followModel,
        filter: { following: req.user._id, status: followStatusTypes.pending },
        populate: [{ path: 'follower', select: 'username image' }]
    });

    return successResponse({ res, data });
});

/**
 * Accept or reject a pending follow request.
 * @route PATCH /follow/requests/:followId
 */
export const handleFollowRequest = asyncHandler(async (req, res, next) => {
    const { followId } = req.params;
    const { action } = req.body;

    const follow = await dbService.findOne({
        model: followModel,
        filter: { _id: followId, following: req.user._id, status: followStatusTypes.pending }
    });

    if (!follow) {
        return next(new Error("Follow request not found", { cause: 404 }));
    }

    if (action === 'accept') {
        await dbService.findByIdAndUpdate({
            model: followModel,
            id: followId,
            data: { status: followStatusTypes.accepted },
            options: { new: true }
        });
        return successResponse({ res, data: { message: "Follow request accepted" } });
    } else {
        await dbService.findByIdAndDelete({ model: followModel, id: followId });
        return successResponse({ res, data: { message: "Follow request rejected" } });
    }
});

/**
 * Block a user.
 * @route POST /follow/:userId/block
 */
export const blockUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const blockerId = req.user._id;

    if (userId.toString() === blockerId.toString()) {
        return next(new Error("You cannot block yourself", { cause: 400 }));
    }

    const targetUser = await dbService.findById({ model: userModel, id: userId });
    if (!targetUser || targetUser.isDeleted) {
        return next(new Error("User not found", { cause: 404 }));
    }

    // Check already blocked
    const existing = await dbService.findOne({
        model: blockModel,
        filter: { blocker: blockerId, blocked: userId }
    });
    if (existing) {
        return next(new Error("User already blocked", { cause: 409 }));
    }

    // Remove any follow relationships between them
    await followModel.deleteMany({
        $or: [
            { follower: blockerId, following: userId },
            { follower: userId, following: blockerId }
        ]
    });

    const block = await dbService.create({
        model: blockModel,
        data: { blocker: blockerId, blocked: userId }
    });

    return successResponse({ res, status: 201, data: { block } });
});

/**
 * Unblock a previously blocked user.
 * @route DELETE /follow/:userId/block
 */
export const unblockUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const block = await dbService.findOneAndDelete({
        model: blockModel,
        filter: { blocker: req.user._id, blocked: userId }
    });

    if (!block) {
        return next(new Error("Block record not found", { cause: 404 }));
    }

    return successResponse({ res, data: {} });
});

/**
 * Get paginated list of blocked users.
 * @route GET /follow/blocked
 */
export const getBlockedUsers = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: blockModel,
        filter: { blocker: req.user._id },
        populate: [{ path: 'blocked', select: 'username image' }]
    });

    return successResponse({ res, data });
});

