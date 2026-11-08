/**
 * @fileoverview Group Data Model
 * @module DB/model/Group.model
 * @description Defines the Mongoose schema for user communities, supporting public/private
 * visibility, categories, rules, and aggregated member/post counters.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const groupPrivacyTypes = {
    public: "public",
    private: "private"
};

export const groupVisibilityTypes = {
    visible: "visible",
    hidden: "hidden"
};

const groupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        description: {
            type: String,
            default: "",
            maxlength: 1000
        },
        rules: {
            type: String,
            default: ""
        },
        category: {
            type: String,
            default: "Community",
            index: true
        },
        privacy: {
            type: String,
            enum: Object.values(groupPrivacyTypes),
            default: groupPrivacyTypes.public,
            index: true
        },
        visibility: {
            type: String,
            enum: Object.values(groupVisibilityTypes),
            default: groupVisibilityTypes.visible,
            index: true
        },
        creator: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        cover: {
            secure_url: {
                type: String,
                default: "/assets/images/bg/02.jpg"
            },
            public_id: String
        },
        avatar: {
            secure_url: {
                type: String,
                default: "/assets/images/logo/01.svg"
            },
            public_id: String
        },
        membersCount: {
            type: Number,
            default: 1,
            min: 0
        },
        postsCount: {
            type: Number,
            default: 0,
            min: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual population of members from GroupMember collection
groupSchema.virtual("membersList", {
    ref: "GroupMember",
    localField: "_id",
    foreignField: "groupId"
});

// Auto-generate unique slug if not explicitly set
groupSchema.pre("validate", function () {
    if (!this.slug && this.name) {
        const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        this.slug = `${base || "group"}-${Math.random().toString(36).substring(2, 7)}`;
    }
});

export const groupModel = mongoose.models.Group || model("Group", groupSchema);
