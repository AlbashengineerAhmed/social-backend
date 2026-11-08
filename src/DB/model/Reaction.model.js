/**
 * @fileoverview Reaction Data Model
 * @module DB/model/Reaction.model
 * @description Defines the Mongoose schema for emoji reactions on posts and comments.
 * Uses a generic targetType/targetId pattern to support multiple entity types.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Supported reaction types
 * @readonly
 * @enum {string}
 */
export const reactionTypes = {
    like: "like",
    love: "love",
    haha: "haha",
    sad: "sad",
    angry: "angry",
    wow: "wow"
};

/**
 * Supported target entity types
 * @readonly
 * @enum {string}
 */
export const targetTypes = {
    Post: "Post",
    Comment: "Comment"
};

/**
 * Reaction Schema definition
 */
const reactionSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: Object.values(targetTypes),
        required: true
    },
    targetId: {
        type: Types.ObjectId,
        required: true,
        refPath: 'targetType'
    },
    type: {
        type: String,
        enum: Object.values(reactionTypes),
        required: true,
        default: reactionTypes.like
    }
}, {
    timestamps: true
});

// Compound unique index: one reaction per user per entity
reactionSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const reactionModel = mongoose.models.Reaction || model("Reaction", reactionSchema);

