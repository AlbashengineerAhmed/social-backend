/**
 * @fileoverview Story View Data Model
 * @module DB/model/StoryView.model
 * @description Defines the Mongoose schema for tracking who viewed a story.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * StoryView Schema definition
 */
const storyViewSchema = new Schema({
    storyId: {
        type: Types.ObjectId,
        ref: 'Story',
        required: true
    },
    viewerId: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound unique index: one view record per user per story
storyViewSchema.index({ storyId: 1, viewerId: 1 }, { unique: true });

export const storyViewModel = mongoose.models.StoryView || model("StoryView", storyViewSchema);

