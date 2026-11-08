/**
 * @fileoverview Follow Relationship Data Model
 * @module DB/model/Follow.model
 * @description Defines the Mongoose schema for user follow relationships,
 * supporting both accepted follows and pending follow requests for private accounts.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Follow status types
 * @readonly
 * @enum {string}
 */
export const followStatusTypes = {
    pending: "pending",
    accepted: "accepted"
};

/**
 * Follow Schema definition
 */
const followSchema = new Schema({
    follower: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    following: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: Object.values(followStatusTypes),
        default: followStatusTypes.accepted
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate follows
followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const followModel = mongoose.models.Follow || model("Follow", followSchema);

