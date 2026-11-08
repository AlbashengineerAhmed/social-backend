/**
 * @fileoverview Post Data Model
 * @module DB/model/Post.model
 * @description Defines the Mongoose schema for user posts, supporting original posts,
 * full reposts, quote reposts, group posts, and privacy controls.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const postTypeCategories = {
    original: "original",
    repost: "repost",
    quote: "quote"
};

export const postPrivacyTypes = {
    public: "public",
    friends: "friends",
    only_me: "only_me",
    group: "group"
};

const postSchema = new Schema(
    {
        postType: {
            type: String,
            enum: Object.values(postTypeCategories),
            default: postTypeCategories.original,
            index: true
        },
        originalPost: {
            type: Types.ObjectId,
            ref: "Post",
            index: true
        },
        content: {
            type: String,
            trim: true,
            required: function () {
                // If repost without thoughts, content is not required
                if (this.postType === postTypeCategories.repost) return false;
                return this.attachments?.length ? false : true;
            }
        },
        attachments: [
            {
                secure_url: String,
                public_id: String
            }
        ],
        likes: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ],
        shareCount: {
            type: Number,
            default: 0,
            min: 0
        },
        privacy: {
            type: String,
            enum: Object.values(postPrivacyTypes),
            default: postPrivacyTypes.public,
            index: true
        },
        groupId: {
            type: Types.ObjectId,
            ref: "Group",
            index: true
        },
        isPinned: {
            type: Boolean,
            default: false
        },
        hiddenBy: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ],
        tags: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ],
        createdBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        updatedBy: {
            type: Types.ObjectId,
            ref: "User"
        },
        deletedBy: {
            type: Types.ObjectId,
            ref: "User"
        },
        isDeleted: Date
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual populate for post comments
postSchema.virtual("comments", {
    localField: "_id",
    foreignField: "postId",
    ref: "Comment"
});

export const postModel = mongoose.models.Post || model("Post", postSchema);
