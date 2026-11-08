/**
 * @fileoverview Report Data Model
 * @module DB/model/Report.model
 * @description Defines the Mongoose schema for user reports against content or other users.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Report target types
 * @readonly
 * @enum {string}
 */
export const reportTargetTypes = {
    User: "User",
    Post: "Post",
    Comment: "Comment"
};

/**
 * Report status types
 * @readonly
 * @enum {string}
 */
export const reportStatusTypes = {
    pending: "pending",
    reviewed: "reviewed",
    resolved: "resolved",
    rejected: "rejected"
};

/**
 * Report reason types
 * @readonly
 * @enum {string}
 */
export const reportReasonTypes = {
    spam: "spam",
    harassment: "harassment",
    hate_speech: "hate_speech",
    violence: "violence",
    nudity: "nudity",
    misinformation: "misinformation",
    other: "other"
};

/**
 * Report Schema definition
 */
const reportSchema = new Schema({
    reporter: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: Object.values(reportTargetTypes),
        required: true
    },
    targetId: {
        type: Types.ObjectId,
        required: true,
        refPath: 'targetType'
    },
    reason: {
        type: String,
        enum: Object.values(reportReasonTypes),
        required: true
    },
    description: {
        type: String,
        maxlength: 500
    },
    status: {
        type: String,
        enum: Object.values(reportStatusTypes),
        default: reportStatusTypes.pending
    },
    reviewedBy: {
        type: Types.ObjectId,
        ref: 'User'
    },
    reviewNote: {
        type: String
    }
}, {
    timestamps: true
});

export const reportModel = mongoose.models.Report || model("Report", reportSchema);

