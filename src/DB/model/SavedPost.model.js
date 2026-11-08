/**
 * @fileoverview Saved Post Data Model
 * @module DB/model/SavedPost.model
 * @description Defines the Mongoose schema for user bookmarked/saved posts.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * SavedPost Schema definition
 */
const savedPostSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    postId: {
        type: Types.ObjectId,
        ref: 'Post',
        required: true
    }
}, {
    timestamps: true
});

// Compound unique index: user can only save a post once
savedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const savedPostModel = mongoose.models.SavedPost || model("SavedPost", savedPostSchema);

