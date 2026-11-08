/**
 * @fileoverview Notification Router
 * @module modules/notification/notification.controller
 */

import { Router } from "express";
import { authentication } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as notificationService from "./service/notification.service.js";
import * as validators from "./notification.validation.js";

const router = Router();

// Route: Get authenticated user's notifications
router.get("/", authentication(), notificationService.getMyNotifications);

// Route: Get unread count
router.get("/unread-count", authentication(), notificationService.getUnreadCount);

// Route: Mark all notifications as read
router.patch("/read-all", authentication(), notificationService.markAllAsRead);

// Route: Mark a notification as read
router.patch(
    "/:notificationId/read",
    authentication(),
    validation(validators.notificationId),
    notificationService.markAsRead
);

// Route: Delete a notification
router.delete(
    "/:notificationId",
    authentication(),
    validation(validators.notificationId),
    notificationService.deleteNotification
);

export default router;

