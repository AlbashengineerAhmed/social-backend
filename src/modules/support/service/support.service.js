/**
 * @fileoverview Support Ticket & Moderation Appeal Business Logic Service
 * @module modules/support/service/support.service
 * @description Provides Meta/Instagram-style multi-action dispute resolution, support inbox,
 * ban appeals, and automated moderation actions.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { supportTicketModel, ticketStatusTypes, ticketTypes, resolutionActionTypes } from "../../../DB/model/SupportTicket.model.js";
import { userModel, roleTypes } from "../../../DB/model/User.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { commentModel } from "../../../DB/model/Comment.model.js";
import { paginate } from "../../../utils/pagination.js";
import { createNotification } from "../../notification/service/notification.service.js";
import { emitToUser } from "../../../socket.js";

/**
 * Create a new support ticket or content report (authenticated user).
 * @route POST /support/tickets
 */
export const createTicket = asyncHandler(async (req, res, next) => {
    const { type, targetType, targetId, reason, subject, description } = req.body;

    if (!subject || !reason) {
        return next(new Error("Subject and reason are required", { cause: 400 }));
    }

    const ticket = await dbService.create({
        model: supportTicketModel,
        data: {
            requester: req.user._id,
            requesterEmail: req.user.email,
            requesterName: req.user.username,
            type: type || ticketTypes.content_report,
            targetType: targetType || "None",
            targetId,
            reason,
            subject,
            description,
            messages: [
                {
                    sender: req.user._id,
                    senderRole: "user",
                    senderName: req.user.username,
                    message: description || subject
                }
            ]
        }
    });

    return successResponse({ res, status: 201, data: { ticket } });
});

/**
 * Submit ban appeal (public route, accessible even if account is banned/token revoked).
 * @route POST /support/appeal
 */
export const submitAppeal = asyncHandler(async (req, res, next) => {
    const { email, subject, reason, description } = req.body;

    if (!email || !description) {
        return next(new Error("Email and detailed explanation are required", { cause: 400 }));
    }

    const user = await dbService.findOne({
        model: userModel,
        filter: { email: email.trim().toLowerCase() }
    });

    if (!user) {
        return next(new Error("No account found associated with this email address", { cause: 404 }));
    }

    const ticket = await dbService.create({
        model: supportTicketModel,
        data: {
            requester: user._id,
            requesterEmail: user.email,
            requesterName: user.username,
            type: ticketTypes.ban_appeal,
            targetType: "User",
            targetId: user._id,
            reason: reason || "Account Suspension Review",
            subject: subject || "Appeal against account suspension",
            description,
            messages: [
                {
                    sender: user._id,
                    senderRole: "user",
                    senderName: user.username,
                    message: description
                }
            ]
        }
    });

    return successResponse({
        res,
        status: 201,
        message: "Your appeal has been received by our moderation team. You will be notified once reviewed.",
        data: { ticketNumber: ticket.ticketNumber }
    });
});

/**
 * Get user's tickets for Support Inbox (/help/support-inbox).
 * @route GET /support/my-tickets
 */
export const getMyTickets = asyncHandler(async (req, res, next) => {
    const { page, size, status } = req.query;

    const filter = { requester: req.user._id };
    if (status) filter.status = status;

    const data = await paginate({
        page,
        size,
        model: supportTicketModel,
        filter,
        sort: { updatedAt: -1 }
    });

    return successResponse({ res, data });
});

/**
 * Get ticket details with conversation thread.
 * @route GET /support/tickets/:ticketId
 */
export const getTicketDetails = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;

    const ticket = await supportTicketModel.findById(ticketId)
        .populate("requester", "username email image")
        .populate("assignedAdmin", "username email");

    if (!ticket) return next(new Error("Ticket not found", { cause: 404 }));

    // User can only view their own ticket, unless admin
    const isAdmin = [roleTypes.admin, roleTypes.superAdmin].includes(req.user.role);
    if (!isAdmin && ticket.requester?._id?.toString() !== req.user._id?.toString()) {
        return next(new Error("Access denied", { cause: 403 }));
    }

    return successResponse({ res, data: { ticket } });
});

/**
 * User replies to their existing ticket.
 * @route POST /support/tickets/:ticketId/reply
 */
export const userReplyTicket = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
        return next(new Error("Message is required", { cause: 400 }));
    }

    const ticket = await supportTicketModel.findById(ticketId);
    if (!ticket) return next(new Error("Ticket not found", { cause: 404 }));

    if (ticket.requester?.toString() !== req.user._id?.toString()) {
        return next(new Error("Access denied", { cause: 403 }));
    }

    ticket.messages.push({
        sender: req.user._id,
        senderRole: "user",
        senderName: req.user.username,
        message: message.trim()
    });

    // Re-open if previously resolved/dismissed
    if ([ticketStatusTypes.resolved, ticketStatusTypes.dismissed].includes(ticket.status)) {
        ticket.status = ticketStatusTypes.in_review;
    }

    await ticket.save();

    return successResponse({ res, data: { ticket } });
});

// ==========================================
// Admin Decision & Moderation Pipeline
// ==========================================

/**
 * Admin list all tickets & appeals.
 * @route GET /support/admin/tickets
 */
export const adminListTickets = asyncHandler(async (req, res, next) => {
    const { page, size, status, type } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const data = await paginate({
        page,
        size,
        model: supportTicketModel,
        filter,
        populate: [
            { path: "requester", select: "username email image role isDeleted" },
            { path: "assignedAdmin", select: "username email" }
        ],
        sort: { createdAt: -1 }
    });

    return successResponse({ res, data });
});

/**
 * Admin compound decision: sends reply + executes moderation action + marks status.
 * @route PATCH /support/admin/tickets/:ticketId/decision
 */
export const adminResolveTicket = asyncHandler(async (req, res, next) => {
    const { ticketId } = req.params;
    const {
        status = ticketStatusTypes.resolved,
        replyMessage,
        action = resolutionActionTypes.none,
        resolutionNote
    } = req.body;

    const ticket = await supportTicketModel.findById(ticketId);
    if (!ticket) return next(new Error("Ticket not found", { cause: 404 }));

    // 1. Append admin reply to conversation if provided
    if (replyMessage?.trim()) {
        ticket.messages.push({
            sender: req.user._id,
            senderRole: "admin",
            senderName: req.user.username || "Moderation Team",
            message: replyMessage.trim()
        });
    }

    ticket.status = status;
    ticket.resolutionAction = action;
    ticket.resolutionNote = resolutionNote || replyMessage || "";
    ticket.assignedAdmin = req.user._id;
    if ([ticketStatusTypes.resolved, ticketStatusTypes.dismissed].includes(status)) {
        ticket.closedAt = Date.now();
    }

    // 2. Execute automated moderation action if specified
    if (action === resolutionActionTypes.content_hidden && ticket.targetType === "Post" && ticket.targetId) {
        await postModel.findByIdAndUpdate(ticket.targetId, {
            isDeleted: Date.now(),
            deletedBy: req.user._id
        });
    } else if (action === resolutionActionTypes.content_deleted && ticket.targetType === "Post" && ticket.targetId) {
        await postModel.findByIdAndDelete(ticket.targetId);
    } else if (action === resolutionActionTypes.user_banned) {
        const targetUserId = ticket.targetType === "User" ? ticket.targetId : null;
        if (targetUserId) {
            await userModel.findByIdAndUpdate(targetUserId, {
                isDeleted: true,
                changeCredentialsTime: Date.now()
            });
        }
    } else if (action === resolutionActionTypes.user_unbanned) {
        // Appeal approved: restore account
        const targetUserId = ticket.targetType === "User" ? ticket.targetId : ticket.requester;
        if (targetUserId) {
            await userModel.findByIdAndUpdate(targetUserId, {
                isDeleted: false
            });
        }
    }

    await ticket.save();

    // 3. Dispatch notification to user
    try {
        const notifType =
            action === resolutionActionTypes.user_unbanned
                ? "appeal_approved"
                : action === resolutionActionTypes.content_hidden || action === resolutionActionTypes.content_deleted
                ? "content_removed"
                : "support_reply";

        const notifMsg = replyMessage
            ? `Support case #${ticket.ticketNumber}: ${replyMessage.slice(0, 100)}`
            : `Support case #${ticket.ticketNumber} was updated to ${status}.`;

        await createNotification({
            recipient: ticket.requester,
            actor: req.user._id,
            type: notifType,
            entityId: ticket._id,
            entityType: "SupportTicket",
            message: notifMsg
        });

        emitToUser(ticket.requester, "support_update", {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            message: notifMsg
        });
    } catch {
        // Continue even if socket emission fails
    }

    return successResponse({
        res,
        message: "Decision recorded and actions executed successfully",
        data: { ticket }
    });
});

