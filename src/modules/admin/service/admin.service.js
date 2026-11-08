/**
 * @fileoverview Admin Business Logic Service
 * @module modules/admin/service/admin.service
 * @description Admin dashboard, user management, content moderation, and reports.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { userModel, roleTypes } from "../../../DB/model/User.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { commentModel } from "../../../DB/model/Comment.model.js";
import { groupModel } from "../../../DB/model/Group.model.js";
import { reportModel, reportStatusTypes, reportTargetTypes } from "../../../DB/model/Report.model.js";
import { paginate } from "../../../utils/pagination.js";

// ========================
// Dashboard
// ========================

/**
 * Returns platform-wide statistics for admin dashboard.
 * @route GET /admin/dashboard
 */
export const getDashboard = asyncHandler(async (req, res, next) => {
    const [
        totalUsers,
        activeUsers,
        deletedUsers,
        totalPosts,
        totalComments,
        totalReports,
        totalGroups
    ] = await Promise.allSettled([
        userModel.countDocuments({}),
        userModel.countDocuments({ confirmEmail: true, isDeleted: false }),
        userModel.countDocuments({ isDeleted: true }),
        postModel.countDocuments({ isDeleted: { $exists: false } }),
        commentModel.countDocuments({ isDeleted: { $exists: false } }),
        reportModel.countDocuments({}),
        groupModel.countDocuments({ isDeleted: { $exists: false } })
    ]);

    return successResponse({
        res,
        data: {
            stats: {
                totalUsers: totalUsers.value || 0,
                activeUsers: activeUsers.value || 0,
                deletedUsers: deletedUsers.value || 0,
                totalPosts: totalPosts.value || 0,
                totalComments: totalComments.value || 0,
                totalReports: totalReports.value || 0,
                totalGroups: totalGroups.value || 0
            }
        }
    });
});

// ========================
// User Management
// ========================

/**
 * List all users with pagination and optional search.
 * @route GET /admin/users
 */
export const listUsers = asyncHandler(async (req, res, next) => {
    const { page, size, search } = req.query;

    const filter = {};
    if (search) {
        filter.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const data = await paginate({
        page,
        size,
        model: userModel,
        filter,
        select: 'firstName lastName username email role confirmEmail isDeleted createdAt image'
    });

    return successResponse({ res, data });
});

/**
 * Get detailed info for a single user.
 * @route GET /admin/users/:userId
 */
export const getUserDetails = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await dbService.findById({
        model: userModel,
        id: userId,
        select: '-password -confirmEmailOTP -resetPasswordOTP -tempEmailOTP'
    });

    if (!user) return next(new Error("User not found", { cause: 404 }));

    return successResponse({ res, data: { user } });
});

/**
 * Ban (soft-delete) a user account.
 * @route PATCH /admin/users/:userId/ban
 */
export const banUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: {
            _id: userId,
            isDeleted: false,
            role: { $nin: [roleTypes.admin, roleTypes.superAdmin] }
        },
        data: { 
            isDeleted: true,
            changeCredentialsTime: Date.now()
        },
        options: { new: true }
    });

    if (!user) return next(new Error("User not found or cannot be banned", { cause: 404 }));

    return successResponse({ res, data: { user } });
});

/**
 * Unban (restore) a previously banned user.
 * @route PATCH /admin/users/:userId/unban
 */
export const unbanUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: { _id: userId, isDeleted: true },
        data: { isDeleted: false },
        options: { new: true }
    });

    if (!user) return next(new Error("User not found or not banned", { cause: 404 }));

    return successResponse({ res, data: { user } });
});

/**
 * Change a user's role (user, admin, superAdmin).
 * @route PATCH /admin/users/:userId/role
 */
export const changeUserRole = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!Object.values(roleTypes).includes(role)) {
        return next(new Error("Invalid role specified", { cause: 400 }));
    }

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: { _id: userId },
        data: { role },
        options: { new: true }
    });

    if (!user) return next(new Error("User not found", { cause: 404 }));

    return successResponse({ res, data: { user } });
});

/**
 * Permanently delete a user account (hard delete).
 * @route DELETE /admin/users/:userId
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    const user = await dbService.findOneAndDelete({
        model: userModel,
        filter: {
            _id: userId,
            role: { $nin: [roleTypes.admin, roleTypes.superAdmin] }
        }
    });

    if (!user) return next(new Error("User not found or cannot be deleted", { cause: 404 }));

    return successResponse({ res, data: {} });
});

// ========================
// Content Management
// ========================

/**
 * List all posts with pagination.
 * @route GET /admin/posts
 */
export const listPosts = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: postModel,
        filter: {},
        populate: [{ path: 'createdBy', select: 'firstName lastName username email image' }]
    });

    return successResponse({ res, data });
});

/**
 * Admin delete a post (hard delete).
 * @route DELETE /admin/posts/:postId
 */
export const adminDeletePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await dbService.findByIdAndDelete({ model: postModel, id: postId });

    if (!post) return next(new Error("Post not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

/**
 * Admin hide (soft-delete) a post.
 * @route PATCH /admin/posts/:postId/hide
 */
export const hidePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await dbService.findByIdAndUpdate({
        model: postModel,
        id: postId,
        data: { isDeleted: Date.now(), deletedBy: req.user._id },
        options: { new: true }
    });

    if (!post) return next(new Error("Post not found", { cause: 404 }));

    return successResponse({ res, data: { post } });
});

/**
 * Admin unhide (restore) a soft-deleted post.
 * @route PATCH /admin/posts/:postId/unhide
 */
export const unhidePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    const post = await dbService.findByIdAndUpdate({
        model: postModel,
        id: postId,
        data: { $unset: { isDeleted: 0, deletedBy: 0 } },
        options: { new: true }
    });

    if (!post) return next(new Error("Post not found", { cause: 404 }));

    return successResponse({ res, data: { post } });
});

/**
 * Admin delete a comment.
 * @route DELETE /admin/comments/:commentId
 */
export const adminDeleteComment = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;

    const comment = await dbService.findByIdAndDelete({ model: commentModel, id: commentId });

    if (!comment) return next(new Error("Comment not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

// ========================
// Reports System
// ========================

/**
 * Submit a report against a user, post, or comment.
 * @route POST /admin/reports
 */
export const submitReport = asyncHandler(async (req, res, next) => {
    const { targetType, targetId, reason, description } = req.body;

    const report = await dbService.create({
        model: reportModel,
        data: {
            reporter: req.user._id,
            targetType,
            targetId,
            reason,
            description
        }
    });

    return successResponse({ res, status: 201, data: { report } });
});

/**
 * Get paginated reports (admin only).
 * @route GET /admin/reports
 */
export const getReports = asyncHandler(async (req, res, next) => {
    const { page, size, status } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const data = await paginate({
        page,
        size,
        model: reportModel,
        filter,
        populate: [
            { path: 'reporter', select: 'username email' },
            { path: 'reviewedBy', select: 'username email' }
        ]
    });

    return successResponse({ res, data });
});

/**
 * Review and update report status.
 * @route PATCH /admin/reports/:reportId
 */
export const reviewReport = asyncHandler(async (req, res, next) => {
    const { reportId } = req.params;
    const { status, reviewNote } = req.body;

    const report = await dbService.findOneAndUpdate({
        model: reportModel,
        filter: { _id: reportId },
        data: {
            status,
            reviewNote,
            reviewedBy: req.user._id
        },
        options: { new: true }
    });

    if (!report) return next(new Error("Report not found", { cause: 404 }));

    return successResponse({ res, data: { report } });
});

// ========================
// Group Management
// ========================

/**
 * List all groups with pagination and creator.
 * @route GET /admin/groups
 */
export const listGroups = asyncHandler(async (req, res, next) => {
    const { page, size, search } = req.query;

    const filter = { isDeleted: { $exists: false } };
    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }

    const data = await paginate({
        page,
        size,
        model: groupModel,
        filter,
        populate: [{ path: 'createdBy', select: 'firstName lastName username email image' }]
    });

    return successResponse({ res, data });
});

/**
 * Delete a group permanently or soft-delete.
 * @route DELETE /admin/groups/:groupId
 */
export const deleteGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;

    const group = await dbService.findByIdAndUpdate({
        model: groupModel,
        id: groupId,
        data: { isDeleted: Date.now() },
        options: { new: true }
    });

    if (!group) return next(new Error("Group not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

