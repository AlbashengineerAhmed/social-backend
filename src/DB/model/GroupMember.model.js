/**
 * @fileoverview Group Member Data Model
 * @module DB/model/GroupMember.model
 * @description Manages member association, roles (owner, admin, moderator, member),
 * and status (active, banned, muted) in an independent collection for massive scale.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const groupMemberRoles = {
    owner: "owner",
    admin: "admin",
    moderator: "moderator",
    member: "member"
};

export const groupMemberStatus = {
    active: "active",
    banned: "banned",
    muted: "muted"
};

const groupMemberSchema = new Schema(
    {
        groupId: {
            type: Types.ObjectId,
            ref: "Group",
            required: true,
            index: true
        },
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: Object.values(groupMemberRoles),
            default: groupMemberRoles.member
        },
        status: {
            type: String,
            enum: Object.values(groupMemberStatus),
            default: groupMemberStatus.active
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index ensuring each user is only added once to a group
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ groupId: 1, role: 1 });
groupMemberSchema.index({ groupId: 1, status: 1 });

export const groupMemberModel = mongoose.models.GroupMember || model("GroupMember", groupMemberSchema);

