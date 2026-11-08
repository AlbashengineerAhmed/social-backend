/**
 * @fileoverview Feed & Search Business Logic Service
 * @module modules/feed/service/feed.service
 * @description Following feed, public explore feed, trending posts, popular users, and search.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { userModel } from "../../../DB/model/User.model.js";
import { followModel, followStatusTypes } from "../../../DB/model/Follow.model.js";
import { groupMemberModel } from "../../../DB/model/GroupMember.model.js";
import { paginate } from "../../../utils/pagination.js";
import { sanitizePostWithOriginal } from "../../post/service/post.service.js";

/**
 * Common post populate config
 */
const postPopulate = [
    { path: 'createdBy', select: 'username image firstName lastName role' },
    {
        path: 'groupId',
        select: 'name slug avatar cover privacy membersCount category description creator'
    },
    {
        path: 'originalPost',
        populate: [
            { path: 'createdBy', select: 'username image firstName lastName role' },
            {
                path: 'groupId',
                select: 'name slug avatar cover privacy membersCount category description creator'
            }
        ]
    },
    {
        path: 'comments',
        match: { commentId: { $exists: false }, isDeleted: { $exists: false } },
        populate: [
            { path: 'createdBy', select: 'username image' },
            {
                path: 'reply',
                match: { isDeleted: { $exists: false } },
                populate: [{ path: 'createdBy', select: 'username image' }]
            }
        ]
    }
];

/**
 * Helper to enrich posts with viewer's group membership status
 */
const enrichPostsWithGroupMembership = async (posts, viewerId) => {
    if (!posts || !posts.length) return [];

    let userGroupIds = new Set();
    if (viewerId) {
        const memberships = await groupMemberModel.find({
            userId: viewerId,
            status: "active"
        }).select("groupId");
        userGroupIds = new Set(memberships.map(m => m.groupId?.toString()));
    }

    return posts.map(p => {
        const sanitized = sanitizePostWithOriginal(p, viewerId);
        const postObj = sanitized.toObject ? sanitized.toObject() : { ...sanitized };

        if (postObj.groupId) {
            const grpId = (postObj.groupId._id || postObj.groupId.id || postObj.groupId).toString();
            const isCreator = viewerId && postObj.groupId.creator?.toString() === viewerId.toString();
            const isMember = viewerId ? Boolean(isCreator || userGroupIds.has(grpId)) : false;
            postObj.isGroupMember = isMember;
            if (typeof postObj.groupId === 'object' && postObj.groupId) {
                postObj.groupId.isMember = isMember;
            }
        }

        return postObj;
    });
};

/**
 * Get the authenticated user's following feed (posts from followed users).
 * @route GET /feed
 */
export const getFollowingFeed = asyncHandler(async (req, res, next) => {
    const { page, size, limit } = req.query;

    // Get IDs of users the current user follows
    const followingList = await followModel.find({
        follower: req.user._id,
        status: followStatusTypes.accepted
    }).select('following');

    const followingIds = followingList.map(f => f.following);
    followingIds.push(req.user._id); // include own posts

    const filter = {
        createdBy: { $in: followingIds },
        isDeleted: { $exists: false }
    };
    if (req.user?._id) {
        filter.hiddenBy = { $ne: req.user._id };
    }

    const data = await paginate({
        page,
        size: size || limit,
        model: postModel,
        filter,
        sort: { createdAt: -1 },
        populate: postPopulate
    });

    if (data?.posts?.length) {
        data.posts = await enrichPostsWithGroupMembership(data.posts, req.user?._id);
    }

    return successResponse({ res, data });
});

/**
 * Public feed – all public posts sorted by newest.
 * @route GET /feed/public
 */
export const getPublicFeed = asyncHandler(async (req, res, next) => {
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
        populate: postPopulate
    });

    if (data?.posts?.length) {
        data.posts = await enrichPostsWithGroupMembership(data.posts, req.user?._id);
    }

    return successResponse({ res, data });
});

/**
 * Trending posts – posts sorted by number of likes descending.
 * @route GET /feed/trending
 */
export const getTrendingPosts = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;
    const pageNum = parseInt(page > 0 ? page : (process.env.PAGE || 1));
    const sizeNum = parseInt(size > 0 ? size : (process.env.SIZE || 10));
    const skip = (pageNum - 1) * sizeNum;

    const posts = await postModel.aggregate([
        { $match: { isDeleted: { $exists: false } } },
        { $addFields: { likesCount: { $size: '$likes' } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: sizeNum }
    ]);

    const count = await postModel.countDocuments({ isDeleted: { $exists: false } });

    return successResponse({ res, data: { data: posts, page: pageNum, size: sizeNum, count } });
});

/**
 * Popular users – sorted by follower count.
 * @route GET /feed/popular-users
 */
export const getPopularUsers = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;
    const pageNum = parseInt(page > 0 ? page : 1);
    const sizeNum = parseInt(size > 0 ? size : 10);
    const skip = (pageNum - 1) * sizeNum;

    const users = await followModel.aggregate([
        { $match: { status: followStatusTypes.accepted } },
        { $group: { _id: '$following', followersCount: { $sum: 1 } } },
        { $sort: { followersCount: -1 } },
        { $skip: skip },
        { $limit: sizeNum },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                followersCount: 1,
                'user.firstName': 1,
                'user.lastName': 1,
                'user.image': 1,
                'user._id': 1
            }
        }
    ]);

    return successResponse({ res, data: { users, page: pageNum, size: sizeNum } });
});

// ========================
// Search
// ========================

/**
 * Search users by username or name.
 * @route GET /feed/search/users
 */
export const searchUsers = asyncHandler(async (req, res, next) => {
    const { q, page, size } = req.query;

    if (!q || q.trim().length < 1) {
        return next(new Error("Search query is required", { cause: 400 }));
    }

    const data = await paginate({
        page,
        size,
        model: userModel,
        filter: {
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ],
            isDeleted: false
        },
        select: 'username image email'
    });

    return successResponse({ res, data });
});

/**
 * Search posts by content.
 * @route GET /feed/search/posts
 */
export const searchPosts = asyncHandler(async (req, res, next) => {
    const { q, page, size } = req.query;

    if (!q || q.trim().length < 1) {
        return next(new Error("Search query is required", { cause: 400 }));
    }

    const data = await paginate({
        page,
        size,
        model: postModel,
        filter: {
            content: { $regex: q, $options: 'i' },
            isDeleted: { $exists: false }
        },
        populate: [{ path: 'createdBy', select: 'username image' }]
    });

    return successResponse({ res, data });
});

