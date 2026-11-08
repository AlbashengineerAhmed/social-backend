/**
 * @fileoverview Friendship Business Logic Service
 * @module modules/friendship/service/friendship.service
 * @description Provides business logic for sending, accepting, rejecting, cancelling friend requests,
 * removing friends, and querying friendship status and friend lists.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { friendshipModel, friendshipStatusTypes } from "../../../DB/model/Friendship.model.js";
import { userModel } from "../../../DB/model/User.model.js";
import { blockModel } from "../../../DB/model/Block.model.js";
import { followModel, followStatusTypes } from "../../../DB/model/Follow.model.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { notificationTypes } from "../../../DB/model/Notification.model.js";

/**
 * Send a friend request to a target user.
 * @action sendRequest
 * @route POST /friendship/request/:userId
 */
export const sendRequest = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // 1. Cannot send request to oneself
    if (userId.toString() === currentUserId.toString()) {
        return next(new Error("You cannot send a friend request to yourself", { cause: 400 }));
    }

    // 2. Validate target user exists and is active
    const targetUser = await dbService.findById({
        model: userModel,
        id: userId,
        filter: { isDeleted: false }
    });
    if (!targetUser) {
        return next(new Error("Target user not found", { cause: 404 }));
    }

    // 3. Check for blocks in either direction
    const isBlocked = await blockModel.findOne({
        $or: [
            { blocker: currentUserId, blocked: userId },
            { blocker: userId, blocked: currentUserId }
        ]
    });
    if (isBlocked) {
        return next(new Error("Cannot perform this action due to privacy/blocking settings", { cause: 403 }));
    }

    // 4. Check existing relationship
    const existingFriendship = await friendshipModel.findOne({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
        ]
    });

    if (existingFriendship) {
        if (existingFriendship.status === friendshipStatusTypes.accepted) {
            return next(new Error("You are already friends with this user", { cause: 400 }));
        }

        if (existingFriendship.status === friendshipStatusTypes.pending) {
            if (existingFriendship.sender.toString() === currentUserId.toString()) {
                return next(new Error("Friend request is already pending", { cause: 400 }));
            } else {
                return next(new Error("This user has already sent you a friend request. You can accept it.", { cause: 400 }));
            }
        }

        // If previously rejected or cancelled, recycle the document
        existingFriendship.sender = currentUserId;
        existingFriendship.receiver = userId;
        existingFriendship.status = friendshipStatusTypes.pending;
        await existingFriendship.save();

        // Dispatch real-time notification
        await createNotification({
            recipient: userId,
            actor: currentUserId,
            type: notificationTypes.friend_request,
            entityId: existingFriendship._id,
            entityType: 'Friendship',
            message: `${req.user.username || 'Someone'} sent you a friend request.`
        });

        return successResponse({
            res,
            status: 200,
            message: "Friend request sent successfully",
            data: { friendship: existingFriendship }
        });
    }

    // 5. Create new friendship request
    const newFriendship = await dbService.create({
        model: friendshipModel,
        data: {
            sender: currentUserId,
            receiver: userId,
            status: friendshipStatusTypes.pending
        }
    });

    // 6. Dispatch real-time notification
    await createNotification({
        recipient: userId,
        actor: currentUserId,
        type: notificationTypes.friend_request,
        entityId: newFriendship._id,
        entityType: 'Friendship',
        message: `${req.user.username || 'Someone'} sent you a friend request.`
    });

    return successResponse({
        res,
        status: 201,
        message: "Friend request sent successfully",
        data: { friendship: newFriendship }
    });
});

/**
 * Accept a pending friend request.
 * @action acceptRequest
 * @route PATCH /friendship/accept/:requestId
 */
export const acceptRequest = asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    // Search by _id or by sender userId
    const friendship = await friendshipModel.findOne({
        $or: [
            { _id: requestId, receiver: currentUserId },
            { sender: requestId, receiver: currentUserId }
        ],
        status: friendshipStatusTypes.pending
    });

    if (!friendship) {
        return next(new Error("Pending friend request not found", { cause: 404 }));
    }

    friendship.status = friendshipStatusTypes.accepted;
    await friendship.save();

    // Auto-create mutual follow so friends see each other's posts in feed
    await Promise.all([
        followModel.findOneAndUpdate(
            { follower: currentUserId, following: friendship.sender },
            { follower: currentUserId, following: friendship.sender, status: followStatusTypes.accepted },
            { upsert: true }
        ),
        followModel.findOneAndUpdate(
            { follower: friendship.sender, following: currentUserId },
            { follower: friendship.sender, following: currentUserId, status: followStatusTypes.accepted },
            { upsert: true }
        )
    ]);

    // Dispatch accepted notification to original sender
    await createNotification({
        recipient: friendship.sender,
        actor: currentUserId,
        type: notificationTypes.friend_accept,
        entityId: friendship._id,
        entityType: 'Friendship',
        message: `${req.user.username || 'A user'} accepted your friend request.`
    });

    return successResponse({
        res,
        status: 200,
        message: "Friend request accepted",
        data: { friendship }
    });
});

/**
 * Reject a pending friend request.
 * @action rejectRequest
 * @route PATCH /friendship/reject/:requestId
 */
export const rejectRequest = asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await friendshipModel.findOne({
        $or: [
            { _id: requestId, receiver: currentUserId },
            { sender: requestId, receiver: currentUserId }
        ],
        status: friendshipStatusTypes.pending
    });

    if (!friendship) {
        return next(new Error("Pending friend request not found", { cause: 404 }));
    }

    friendship.status = friendshipStatusTypes.rejected;
    await friendship.save();

    return successResponse({
        res,
        status: 200,
        message: "Friend request rejected",
        data: { friendship }
    });
});

/**
 * Cancel an outgoing friend request.
 * @action cancelRequest
 * @route DELETE /friendship/cancel/:requestId
 */
export const cancelRequest = asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await friendshipModel.findOne({
        $or: [
            { _id: requestId, sender: currentUserId },
            { receiver: requestId, sender: currentUserId }
        ],
        status: friendshipStatusTypes.pending
    });

    if (!friendship) {
        return next(new Error("Pending friend request not found", { cause: 404 }));
    }

    friendship.status = friendshipStatusTypes.cancelled;
    await friendship.save();

    return successResponse({
        res,
        status: 200,
        message: "Friend request cancelled",
        data: { friendship }
    });
});

/**
 * Remove an existing friend.
 * @action removeFriend
 * @route DELETE /friendship/friend/:friendId
 */
export const removeFriend = asyncHandler(async (req, res, next) => {
    const { friendId } = req.params;
    const currentUserId = req.user._id;

    const friendship = await friendshipModel.findOneAndDelete({
        status: friendshipStatusTypes.accepted,
        $or: [
            { sender: currentUserId, receiver: friendId },
            { sender: friendId, receiver: currentUserId }
        ]
    });

    if (!friendship) {
        return next(new Error("Friendship not found or already removed", { cause: 404 }));
    }

    return successResponse({
        res,
        status: 200,
        message: "Friend removed successfully",
        data: {}
    });
});

/**
 * Get all received pending friend requests.
 * @action getReceivedRequests
 * @route GET /friendship/received
 */
export const getReceivedRequests = asyncHandler(async (req, res, next) => {
    const requests = await friendshipModel.find({
        receiver: req.user._id,
        status: friendshipStatusTypes.pending
    }).populate('sender', 'firstName lastName email image username').sort({ createdAt: -1 });

    return successResponse({
        res,
        status: 200,
        data: { requests }
    });
});

/**
 * Get all sent pending friend requests.
 * @action getSentRequests
 * @route GET /friendship/sent
 */
export const getSentRequests = asyncHandler(async (req, res, next) => {
    const requests = await friendshipModel.find({
        sender: req.user._id,
        status: friendshipStatusTypes.pending
    }).populate('receiver', 'firstName lastName email image username').sort({ createdAt: -1 });

    return successResponse({
        res,
        status: 200,
        data: { requests }
    });
});

/**
 * Get list of friends.
 * @action getFriends
 * @route GET /friendship/friends or GET /friendship/friends/:userId
 */
export const getFriends = asyncHandler(async (req, res, next) => {
    const targetUserId = req.params.userId || req.user._id;

    const friendships = await friendshipModel.find({
        status: friendshipStatusTypes.accepted,
        $or: [
            { sender: targetUserId },
            { receiver: targetUserId }
        ]
    })
    .populate('sender', 'firstName lastName email image username')
    .populate('receiver', 'firstName lastName email image username')
    .sort({ updatedAt: -1 });

    // Format list so each entry represents the friend relative to targetUserId
    const friends = friendships.map(f => {
        const friend = f.sender._id.toString() === targetUserId.toString() ? f.receiver : f.sender;
        return {
            _id: friend._id,
            firstName: friend.firstName,
            lastName: friend.lastName,
            username: friend.username,
            email: friend.email,
            image: friend.image,
            friendshipId: f._id,
            since: f.updatedAt
        };
    });

    return successResponse({
        res,
        status: 200,
        data: { friends, count: friends.length }
    });
});

/**
 * Get current friendship status with a specific user.
 * @action getFriendshipStatus
 * @route GET /friendship/status/:userId
 */
export const getFriendshipStatus = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId.toString() === currentUserId.toString()) {
        return successResponse({
            res,
            data: { status: 'self' }
        });
    }

    const friendship = await friendshipModel.findOne({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
        ]
    });

    if (!friendship) {
        return successResponse({
            res,
            data: { status: 'none' }
        });
    }

    if (friendship.status === friendshipStatusTypes.accepted) {
        return successResponse({
            res,
            data: { status: 'friends', friendshipId: friendship._id }
        });
    }

    if (friendship.status === friendshipStatusTypes.pending) {
        const isSender = friendship.sender.toString() === currentUserId.toString();
        return successResponse({
            res,
            data: {
                status: isSender ? 'pending_sent' : 'pending_received',
                requestId: friendship._id
            }
        });
    }

    return successResponse({
        res,
        data: { status: 'none' }
    });
});
