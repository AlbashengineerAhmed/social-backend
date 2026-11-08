/**
 * @fileoverview Support Ticket & Moderation Appeal Data Model
 * @module DB/model/SupportTicket.model
 * @description Defines the Mongoose schema for user grievances, content reports, ban appeals,
 * and support inquiries following the Meta/Instagram Support Inbox paradigm.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const ticketTypes = {
    content_report: "content_report",
    ban_appeal: "ban_appeal",
    account_inquiry: "account_inquiry",
    bug_report: "bug_report"
};

export const ticketStatusTypes = {
    pending: "pending",
    in_review: "in_review",
    resolved: "resolved",
    dismissed: "dismissed"
};

export const ticketPriorityTypes = {
    low: "low",
    medium: "medium",
    high: "high",
    urgent: "urgent"
};

export const resolutionActionTypes = {
    none: "none",
    content_hidden: "content_hidden",
    content_deleted: "content_deleted",
    user_banned: "user_banned",
    user_unbanned: "user_unbanned",
    warning_issued: "warning_issued"
};

const messageSchema = new Schema(
    {
        sender: {
            type: Types.ObjectId,
            ref: "User"
        },
        senderRole: {
            type: String,
            enum: ["user", "admin", "system"],
            default: "user"
        },
        senderName: {
            type: String
        },
        message: {
            type: String,
            required: true,
            maxlength: 2000
        },
        attachments: [
            {
                secure_url: String,
                public_id: String
            }
        ]
    },
    {
        timestamps: true
    }
);

const supportTicketSchema = new Schema(
    {
        ticketNumber: {
            type: String,
            unique: true,
            required: true,
            index: true
        },
        requester: {
            type: Types.ObjectId,
            ref: "User",
            index: true
        },
        requesterEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },
        requesterName: {
            type: String,
            trim: true
        },
        type: {
            type: String,
            enum: Object.values(ticketTypes),
            default: ticketTypes.content_report,
            index: true
        },
        targetType: {
            type: String,
            enum: ["Post", "Comment", "User", "Group", "None"],
            default: "None"
        },
        targetId: {
            type: Types.ObjectId
        },
        reason: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true,
            maxlength: 150
        },
        description: {
            type: String,
            maxlength: 2000
        },
        status: {
            type: String,
            enum: Object.values(ticketStatusTypes),
            default: ticketStatusTypes.pending,
            index: true
        },
        priority: {
            type: String,
            enum: Object.values(ticketPriorityTypes),
            default: ticketPriorityTypes.medium
        },
        assignedAdmin: {
            type: Types.ObjectId,
            ref: "User"
        },
        resolutionAction: {
            type: String,
            enum: Object.values(resolutionActionTypes),
            default: resolutionActionTypes.none
        },
        resolutionNote: {
            type: String
        },
        messages: [messageSchema],
        closedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Pre-save hook to generate human-readable case number: e.g. TKT-2026-8491
supportTicketSchema.pre("validate", function (next) {
    if (!this.ticketNumber) {
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const year = new Date().getFullYear();
        this.ticketNumber = `TKT-${year}-${randomDigits}`;
    }
    next();
});

export const supportTicketModel =
    mongoose.models.SupportTicket || model("SupportTicket", supportTicketSchema);

