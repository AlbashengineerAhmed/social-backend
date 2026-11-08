/**
 * @fileoverview Notification Data Model
 * @module DB/model/Notification.model
 * @description Defines the Mongoose schema for user notifications, expanded for Groups, Events, and Sharing.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const notificationTypes = {
    follow: "follow",
    follow_request: "follow_request",
    follow_accept: "follow_accept",
    friend_request: "friend_request",
    friend_accept: "friend_accept",
    like_post: "like_post",
    reaction_post: "reaction_post",
    comment: "comment",
    reply: "reply",
    mention: "mention",
    like_comment: "like_comment",
    post_share: "post_share",
    story_reaction: "story_reaction",
    story_reply: "story_reply",
    group_invite: "group_invite",
    group_request: "group_request",
    group_approved: "group_approved",
    event_invite: "event_invite",
    event_reminder: "event_reminder",
    support_reply: "support_reply",
    appeal_approved: "appeal_approved",
    appeal_rejected: "appeal_rejected",
    content_removed: "content_removed"
};

const notificationSchema = new Schema(
    {
        recipient: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        actor: {
            type: Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            enum: Object.values(notificationTypes),
            required: true
        },
        entityId: {
            type: Types.ObjectId
        },
        entityType: {
            type: String,
            enum: ["Post", "Comment", "Follow", "Story", "Friendship", "Group", "Event"]
        },
        isRead: {
            type: Boolean,
            default: false
        },
        message: {
            type: String
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const notificationModel = mongoose.models.Notification || model("Notification", notificationSchema);
