/**
 * @fileoverview Block Relationship Data Model
 * @module DB/model/Block.model
 * @description Defines the Mongoose schema for user block relationships.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Block Schema definition
 */
const blockSchema = new Schema({
    blocker: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    blocked: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate blocks
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const blockModel = mongoose.models.Block || model("Block", blockSchema);

