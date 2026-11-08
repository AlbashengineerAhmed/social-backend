/**
 * @fileoverview Notification Business Logic Service
 * @module modules/notification/service/notification.service
 * @description Provides reusable notification creation and management endpoints.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { notificationModel } from "../../../DB/model/Notification.model.js";
import { paginate } from "../../../utils/pagination.js";
import { emitToUser } from "../../../socket.js";

/**
 * Reusable helper to create a notification.
 * @param {Object} options
 * @param {string} options.recipient - Recipient user ID
 * @param {string} options.actor - Actor user ID
 * @param {string} options.type - Notification type
 * @param {string} [options.entityId] - Related entity ID
 * @param {string} [options.entityType] - Related entity type (Post, Comment, etc.)
 * @param {string} [options.message] - Custom message
 * @returns {Promise<Document>} Created notification
 */
export const createNotification = async ({ recipient, actor, type, entityId, entityType, message } = {}) => {
    // Don't notify yourself
    if (recipient?.toString() === actor?.toString()) return null;

    const notif = await dbService.create({
        model: notificationModel,
        data: { recipient, actor, type, entityId, entityType, message }
    });

    try {
        const populated = await notificationModel.findById(notif._id).populate('actor', 'username image firstName lastName');
        emitToUser(recipient, "notification", populated || notif);
    } catch (err) {
        // Continue even if socket emission fails
    }

    return notif;
};

/**
 * Get paginated notifications for the authenticated user.
 * @route GET /notification
 */
export const getMyNotifications = asyncHandler(async (req, res, next) => {
    const { page, size } = req.query;

    const data = await paginate({
        page,
        size,
        model: notificationModel,
        filter: { recipient: req.user._id },
        populate: [{ path: 'actor', select: 'firstName lastName username image email' }]
    });

    return successResponse({ res, data });
});

/**
 * Get unread notification count.
 * @route GET /notification/unread-count
 */
export const getUnreadCount = asyncHandler(async (req, res, next) => {
    const count = await notificationModel.countDocuments({
        recipient: req.user._id,
        isRead: false
    });

    return successResponse({ res, data: { count } });
});

/**
 * Mark a specific notification as read.
 * @route PATCH /notification/:notificationId/read
 */
export const markAsRead = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;

    const notification = await dbService.findOneAndUpdate({
        model: notificationModel,
        filter: { _id: notificationId, recipient: req.user._id },
        data: { isRead: true },
        options: { new: true }
    });

    if (!notification) return next(new Error("Notification not found", { cause: 404 }));

    return successResponse({ res, data: { notification } });
});

/**
 * Mark all notifications as read.
 * @route PATCH /notification/read-all
 */
export const markAllAsRead = asyncHandler(async (req, res, next) => {
    await dbService.updateMany({
        model: notificationModel,
        filter: { recipient: req.user._id, isRead: false },
        data: { isRead: true }
    });

    return successResponse({ res, data: {} });
});

/**
 * Delete a specific notification.
 * @route DELETE /notification/:notificationId
 */
export const deleteNotification = asyncHandler(async (req, res, next) => {
    const { notificationId } = req.params;

    const notification = await dbService.findOneAndDelete({
        model: notificationModel,
        filter: { _id: notificationId, recipient: req.user._id }
    });

    if (!notification) return next(new Error("Notification not found", { cause: 404 }));

    return successResponse({ res, data: {} });
});

