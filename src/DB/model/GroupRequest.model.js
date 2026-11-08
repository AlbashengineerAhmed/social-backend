/**
 * @fileoverview Group Join Request Data Model
 * @module DB/model/GroupRequest.model
 * @description Manages pending/reviewed membership requests for private groups.
 * Implements partial unique indexing to ensure only 1 pending request per user per group.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const groupRequestStatus = {
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    cancelled: "cancelled"
};

const groupRequestSchema = new Schema(
    {
        groupId: {
            type: Types.ObjectId,
            ref: "Group",
            required: true,
            index: true
        },
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(groupRequestStatus),
            default: groupRequestStatus.pending
        },
        reviewedBy: {
            type: Types.ObjectId,
            ref: "User"
        },
        reviewedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Requirement 1: Partial unique index ensuring strictly ONE pending request per user per group
groupRequestSchema.index(
    { groupId: 1, userId: 1 },
    { 
        unique: true, 
        partialFilterExpression: { status: "pending" } 
    }
);
groupRequestSchema.index({ groupId: 1, status: 1 });

export const groupRequestModel = mongoose.models.GroupRequest || model("GroupRequest", groupRequestSchema);

