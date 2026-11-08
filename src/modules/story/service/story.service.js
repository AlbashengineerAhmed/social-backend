/**
 * @fileoverview Story Business Logic Service
 * @module modules/story/service/story.service
 * @description Handles story creation with Cloudinary media upload, TTL expiry, views tracking,
 * and retrieval of stories from followed users.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { storyModel } from "../../../DB/model/Story.model.js";
import { storyViewModel } from "../../../DB/model/StoryView.model.js";
import { followModel, followStatusTypes } from "../../../DB/model/Follow.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { notificationTypes } from "../../../DB/model/Notification.model.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { conversationModel } from "../../../DB/model/Conversation.model.js";
import { messageModel } from "../../../DB/model/Message.model.js";
import { emitToUser } from "../../../socket.js";

/**
 * Create a new story (image, video, or text).
 * @route POST /story
 */
export const createStory = asyncHandler(async (req, res, next) => {
    let { content, backgroundColor, textColor, visibility, music, stickers, location, textPosition } = req.body;
    let media;

    if (typeof music === 'string') {
        try { music = JSON.parse(music); } catch { /* ignore */ }
    }
    if (typeof stickers === 'string') {
        try { stickers = JSON.parse(stickers); } catch { /* ignore */ }
    }
    if (typeof location === 'string') {
        try { location = JSON.parse(location); } catch { /* ignore */ }
    }
    if (typeof textPosition === 'string') {
        try { textPosition = JSON.parse(textPosition); } catch { /* ignore */ }
    }

    if (req.file) {
        const isVideo = req.file.mimetype?.startsWith('video');
        const uploadResult = await cloud.uploader.upload(req.file.path, {
            folder: `${process.env.APP_NAME || 'Social Media App'}/user/${req.user._id}/stories`,
            resource_type: isVideo ? "video" : "auto"
        });
        media = {
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            type: isVideo ? 'video' : 'image'
        };
    }

    if (!content && !media && !music) {
        return next(new Error("Story must have content, media, or music", { cause: 400 }));
    }

    const story = await dbService.create({
        model: storyModel,
        data: {
            createdBy: req.user._id,
            content,
            media,
            backgroundColor: backgroundColor || '#2563eb',
            textColor: textColor || '#FFFFFF',
            music,
            stickers: Array.isArray(stickers) ? stickers : [],
            textPosition: textPosition || undefined,
            location: location || undefined,
            visibility: visibility || storyVisibilityTypes.public
        }
    });

    return successResponse({ res, status: 201, data: { story } });
});

/**
 * Get authenticated user's own active stories.
 * @route GET /story/me
 */
export const getMyStories = asyncHandler(async (req, res, next) => {
    const stories = await dbService.find({
        model: storyModel,
        filter: {
            createdBy: req.user._id,
            expiresAt: { $gt: new Date() }
        },
        populate: [{ path: 'views', select: 'viewerId' }]
    });

    return successResponse({ res, data: { stories } });
});

/**
 * Get stories from users the authenticated user follows (story feed) or public stories.
 * @route GET /story/feed
 */
export const getFollowingStories = asyncHandler(async (req, res, next) => {
    // Get IDs of users the current user follows
    const followingList = await followModel.find({
        follower: req.user._id,
        status: followStatusTypes.accepted
    }).select('following');

    const followingIds = followingList.map(f => f.following);

    // Retrieve active stories from followed users OR public/community stories (excluding current user)
    const stories = await dbService.find({
        model: storyModel,
        filter: {
            createdBy: { $ne: req.user._id },
            $or: [
                { createdBy: { $in: followingIds } },
                { visibility: { $in: ['public', 'followers'] } }
            ],
            expiresAt: { $gt: new Date() }
        },
        populate: [{ path: 'createdBy', select: 'username firstName lastName image profilePicture' }]
    });

    // Group stories by user
    const grouped = stories.reduce((acc, story) => {
        if (!story.createdBy) return acc;
        const userId = story.createdBy._id.toString();
        if (!acc[userId]) {
            acc[userId] = { user: story.createdBy, stories: [] };
        }
        acc[userId].stories.push(story);
        return acc;
    }, {});

    return successResponse({ res, data: { feed: Object.values(grouped) } });
});

/**
 * Get a single story by ID (and record view).
 * @route GET /story/:storyId
 */
export const getStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;

    const story = await dbService.findOne({
        model: storyModel,
        filter: { _id: storyId, expiresAt: { $gt: new Date() } },
        populate: [{ path: 'createdBy', select: 'username image' }]
    });

    if (!story) return next(new Error("Story not found or expired", { cause: 404 }));

    // Record view (upsert to avoid duplicates)
    await storyViewModel.findOneAndUpdate(
        { storyId, viewerId: req.user._id },
        { storyId, viewerId: req.user._id },
        { upsert: true }
    );

    return successResponse({ res, data: { story } });
});

/**
 * Delete own story and remove its media from Cloudinary.
 * @route DELETE /story/:storyId
 */
export const deleteStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;

    const story = await dbService.findOneAndDelete({
        model: storyModel,
        filter: { _id: storyId, createdBy: req.user._id }
    });

    if (!story) return next(new Error("Story not found or not authorized", { cause: 404 }));

    // Delete media from Cloudinary if it exists
    if (story.media?.public_id) {
        await cloud.uploader.destroy(story.media.public_id, {
            resource_type: story.media.type === 'video' ? 'video' : 'image'
        });
    }

    // Remove all associated views
    await storyViewModel.deleteMany({ storyId });

    return successResponse({ res, data: {} });
});

/**
 * Get paginated viewers list for a story (story owner only).
 * @route GET /story/:storyId/viewers
 */
export const getStoryViewers = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;

    const story = await dbService.findOne({
        model: storyModel,
        filter: { _id: storyId, createdBy: req.user._id }
    });

    if (!story) return next(new Error("Story not found or not authorized", { cause: 404 }));

    const viewers = await dbService.find({
        model: storyViewModel,
        filter: { storyId },
        populate: [{ path: 'viewerId', select: 'username firstName lastName image profilePicture' }]
    });

    return successResponse({ res, data: { viewers, count: viewers.length, reactions: story.reactions || [] } });
});

/**
 * React to a story with an emoji (e.g. ❤️, 🔥, 👏, 😂, 😍).
 * Stores reaction and notifies the story author in real time.
 * @route POST /story/:storyId/react
 */
export const reactToStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;
    const { emoji = '❤️' } = req.body;

    const story = await storyModel.findOne({
        _id: storyId,
        expiresAt: { $gt: new Date() }
    });

    if (!story) {
        return next(new Error("Story not found or expired", { cause: 404 }));
    }

    if (!story.reactions) story.reactions = [];
    story.reactions.push({
        userId: req.user._id,
        emoji,
        createdAt: new Date()
    });
    await story.save();

    // Notify author if not reacting to own story
    const actorName = req.user.username || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Someone';
    await createNotification({
        recipient: story.createdBy,
        actor: req.user._id,
        type: notificationTypes.story_reaction,
        entityId: story._id,
        entityType: "Story",
        message: `${actorName} reacted ${emoji} to your story`
    });

    return successResponse({
        res,
        status: 200,
        message: `Reacted ${emoji} to story`,
        data: { emoji, storyId }
    });
});

/**
 * Reply to a story with a direct message.
 * Creates a chat message and delivers a real-time notification to the story author.
 * @route POST /story/:storyId/reply
 */
export const replyToStory = asyncHandler(async (req, res, next) => {
    const { storyId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
        return next(new Error("Reply message cannot be empty", { cause: 400 }));
    }

    const story = await storyModel.findOne({
        _id: storyId,
        expiresAt: { $gt: new Date() }
    });

    if (!story) {
        return next(new Error("Story not found or expired", { cause: 404 }));
    }

    const actorId = req.user._id;
    const recipientId = story.createdBy;
    const actorName = req.user.username || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Someone';

    // 1. Send direct chat message
    let messageDoc = null;
    try {
        let conversation = await conversationModel.findOne({
            participants: { $all: [actorId, recipientId] }
        });

        if (!conversation) {
            conversation = await conversationModel.create({
                participants: [actorId, recipientId]
            });
        }

        const replyContent = `Replied to your story: "${text.trim()}"`;
        messageDoc = await messageModel.create({
            conversationId: conversation._id,
            senderId: actorId,
            text: replyContent
        });

        conversation.lastMessage = messageDoc._id;
        await conversation.save();

        emitToUser(recipientId, "new_message", {
            conversationId: conversation._id,
            senderId: actorId,
            text: replyContent,
            createdAt: new Date()
        });
    } catch (chatErr) {
        console.error("Story chat reply creation error:", chatErr);
    }

    // 2. Deliver real-time notification
    await createNotification({
        recipient: recipientId,
        actor: actorId,
        type: notificationTypes.story_reply,
        entityId: story._id,
        entityType: "Story",
        message: `${actorName} replied to your story: "${text.trim().substring(0, 45)}"`
    });

    return successResponse({
        res,
        status: 200,
        message: "Reply sent to story author",
        data: { message: messageDoc }
    });
});

