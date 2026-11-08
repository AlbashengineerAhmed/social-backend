/**
 * @fileoverview Friendship Relationship Data Model
 * @module DB/model/Friendship.model
 * @description Defines the Mongoose schema for user friendships and friend requests,
 * supporting states: pending, accepted, rejected, and cancelled.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Friendship status types
 * @readonly
 * @enum {string}
 */
export const friendshipStatusTypes = {
    pending: "pending",
    accepted: "accepted",
    rejected: "rejected",
    cancelled: "cancelled"
};

/**
 * Friendship Schema definition
 */
const friendshipSchema = new Schema({
    sender: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(friendshipStatusTypes),
        default: friendshipStatusTypes.pending
    }
}, {
    timestamps: true
});

// Indexes for high performance lookups
friendshipSchema.index({ sender: 1, receiver: 1 });
friendshipSchema.index({ receiver: 1, status: 1 });
friendshipSchema.index({ sender: 1, status: 1 });

export const friendshipModel = mongoose.models.Friendship || model("Friendship", friendshipSchema);

