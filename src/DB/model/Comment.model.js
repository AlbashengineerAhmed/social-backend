/**
 * @fileoverview Comment Data Model
 * @module DB/model/Comment.model
 * @description Defines the Mongoose schema for post comments and bounded nested replies
 * (parentComment, depth capped at 3) preserving backward compatibility with commentId.
 */

import mongoose, { Schema, Types, model } from "mongoose";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            trim: true,
            required: function () {
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
        tags: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ],
        postId: {
            type: Types.ObjectId,
            ref: "Post",
            required: true,
            index: true
        },
        // Backward-compatible reference to parent comment
        commentId: {
            type: Types.ObjectId,
            ref: "Comment",
            index: true
        },
        parentComment: {
            type: Types.ObjectId,
            ref: "Comment",
            index: true
        },
        depth: {
            type: Number,
            default: 1,
            max: 3
        },
        createdBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true
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

// Synchronize commentId and parentComment
commentSchema.pre("validate", function () {
    if (this.commentId && !this.parentComment) {
        this.parentComment = this.commentId;
    }
    if (this.parentComment && !this.commentId) {
        this.commentId = this.parentComment;
    }
});

// Virtual populate for nested replies
commentSchema.virtual("reply", {
    localField: "_id",
    foreignField: "commentId",
    ref: "Comment"
});

export const commentModel = mongoose.models.Comment || model("Comment", commentSchema);
