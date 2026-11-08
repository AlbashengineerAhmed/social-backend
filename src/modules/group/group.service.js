/**
 * @fileoverview Groups Business Logic & Service Layer
 * @module modules/group/group.service
 * @description Implements enterprise group management, role-based authorization,
 * public/private membership workflows, atomic counter updates, and group feeds.
 */

import mongoose from "mongoose";
import { asyncHandler } from "../../utils/response/error.response.js";
import { successResponse } from "../../utils/response/success.response.js";
import { groupModel, groupPrivacyTypes, groupVisibilityTypes } from "../../DB/model/Group.model.js";
import { groupMemberModel, groupMemberRoles, groupMemberStatus } from "../../DB/model/GroupMember.model.js";
import { groupRequestModel, groupRequestStatus } from "../../DB/model/GroupRequest.model.js";
import { postModel, postPrivacyTypes } from "../../DB/model/Post.model.js";
import { postFullPopulate, sanitizePostWithOriginal } from "../post/service/post.service.js";
import { paginate } from "../../utils/pagination.js";
import { cloud } from "../../utils/multer/cloudinary.multer.js";
import { createNotification } from "../notification/service/notification.service.js";
import { notificationTypes } from "../../DB/model/Notification.model.js";

/**
 * Helper to resolve group by ID or slug
 */
const findGroupByIdOrSlug = async (identifier) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
    const filter = {
        isDeleted: false,
        ...(isObjectId ? { $or: [{ _id: identifier }, { slug: identifier }] } : { slug: identifier })
    };
    return await groupModel.findOne(filter);
};

/**
 * Retrieve paginated public and visible groups with search and category filters.
 * @route GET /group
 */
export const getGroups = asyncHandler(async (req, res, next) => {
    const { page, size, category, search } = req.query;

    const filter = {
        isDeleted: false,
        visibility: groupVisibilityTypes.visible
    };

    if (category && category !== "All") {
        filter.category = new RegExp(`^${category}$`, "i");
    }

    if (search && search.trim()) {
        filter.name = { $regex: search.trim(), $options: "i" };
    }

    const data = await paginate({
        page,
        size,
        model: groupModel,
        filter,
        populate: [{ path: "creator", select: "username image firstName lastName" }]
    });

    const groupsList = data.data || [];

    // If viewer is logged in, attach membership metadata
    if (req.user?._id && groupsList.length > 0) {
        const groupIds = groupsList.map((g) => g._id);
        const memberships = await groupMemberModel.find({
            groupId: { $in: groupIds },
            userId: req.user._id,
            status: groupMemberStatus.active
        });

        const pendingRequests = await groupRequestModel.find({
            groupId: { $in: groupIds },
            userId: req.user._id,
            status: groupRequestStatus.pending
        });

        const memberMap = new Map(memberships.map((m) => [m.groupId.toString(), m]));
        const requestMap = new Map(pendingRequests.map((r) => [r.groupId.toString(), r]));

        const enriched = groupsList.map((g) => {
            const gObj = g.toObject ? g.toObject() : { ...g };
            const m = memberMap.get(g._id.toString());
            const r = requestMap.get(g._id.toString());
            const isCreator =
                (gObj.creator?._id && gObj.creator._id.toString() === req.user._id.toString()) ||
                (gObj.creator && gObj.creator.toString() === req.user._id.toString());
            gObj.isMember = Boolean(m || isCreator);
            gObj.memberRole = m?.role || (isCreator ? groupMemberRoles.owner : null);
            gObj.isPendingRequest = Boolean(r && !gObj.isMember);
            return gObj;
        });

        data.groups = enriched;
        data.data = enriched;
    } else {
        data.groups = groupsList;
    }

    return successResponse({
        res,
        status: 200,
        message: "Groups retrieved successfully",
        data
    });
});

/**
 * Retrieve groups the authenticated user belongs to.
 * @route GET /group/my
 */
export const getMyGroups = asyncHandler(async (req, res, next) => {
    const memberships = await groupMemberModel.find({
        userId: req.user._id,
        status: groupMemberStatus.active
    }).populate({
        path: "groupId",
        match: { isDeleted: false },
        populate: { path: "creator", select: "username image" }
    });

    const groups = memberships
        .map((m) => {
            if (!m.groupId) return null;
            const g = m.groupId.toObject ? m.groupId.toObject() : { ...m.groupId };
            g.isMember = true;
            g.memberRole = m.role;
            return g;
        })
        .filter(Boolean);

    return successResponse({
        res,
        status: 200,
        data: { groups }
    });
});

/**
 * Retrieve single group details by ID or slug with viewer's membership state.
 * @route GET /group/:groupId
 */
export const getGroupById = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrSlug(groupId);

    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const groupObj = group.toObject ? group.toObject() : { ...group };

    let membership = null;
    let pendingRequest = null;

    if (req.user?._id) {
        membership = await groupMemberModel.findOne({
            groupId: group._id,
            userId: req.user._id,
            status: groupMemberStatus.active
        });

        pendingRequest = await groupRequestModel.findOne({
            groupId: group._id,
            userId: req.user._id,
            status: groupRequestStatus.pending
        });
    }

    groupObj.isMember = !!membership;
    groupObj.memberRole = membership?.role || null;
    groupObj.isPendingRequest = !!pendingRequest;

    return successResponse({
        res,
        status: 200,
        data: { group: groupObj }
    });
});

/**
 * Create a new group with creator assigned as owner.
 * @route POST /group
 */
export const createGroup = asyncHandler(async (req, res, next) => {
    const { name, description, rules, category, privacy, visibility, avatar, cover } = req.body;

    if (!name || !name.trim()) {
        return next(new Error("Group name is required", { cause: 400 }));
    }

    const group = await groupModel.create({
        name: name.trim(),
        description: description || "",
        rules: rules || "",
        category: category || "Community",
        privacy: privacy || groupPrivacyTypes.public,
        visibility: visibility || groupVisibilityTypes.visible,
        avatar: avatar ? { secure_url: avatar } : undefined,
        cover: cover ? { secure_url: cover } : undefined,
        creator: req.user._id,
        membersCount: 1,
        postsCount: 0
    });

    // Create owner record in GroupMember collection
    await groupMemberModel.create({
        groupId: group._id,
        userId: req.user._id,
        role: groupMemberRoles.owner,
        status: groupMemberStatus.active
    });

    const populated = await groupModel.findById(group._id).populate("creator", "username image");
    const groupObj = populated?.toObject ? populated.toObject() : { ...populated };
    groupObj.isMember = true;
    groupObj.memberRole = groupMemberRoles.owner;
    groupObj.isPendingRequest = false;

    return successResponse({
        res,
        status: 201,
        message: "Group created successfully",
        data: { group: groupObj }
    });
});

/**
 * Update group details (Owner and Admin only).
 * @route PATCH /group/:groupId
 */
export const updateGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrSlug(groupId);

    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const membership = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    const isCreator = group.creator?.toString() === req.user._id.toString();
    const isAuthorized = (membership && [groupMemberRoles.owner, groupMemberRoles.admin].includes(membership.role)) || isCreator || req.user.role === "admin";
    if (!isAuthorized) {
        return next(new Error("Only group owner or admins can modify group settings", { cause: 403 }));
    }

    const allowedUpdates = ["name", "description", "rules", "category", "privacy", "visibility"];
    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            group[key] = req.body[key];
        }
    }

    if (req.body.cover) {
        group.cover = { secure_url: req.body.cover };
    }
    if (req.body.avatar) {
        group.avatar = { secure_url: req.body.avatar };
    }

    await group.save();

    return successResponse({
        res,
        status: 200,
        message: "Group settings updated successfully",
        data: { group }
    });
});

/**
 * Soft delete group (Owner only).
 * @route DELETE /group/:groupId
 */
export const deleteGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrSlug(groupId);

    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const membership = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    const isCreator = group.creator?.toString() === req.user._id.toString();
    const isOwner = (membership && membership.role === groupMemberRoles.owner) || isCreator || req.user.role === "admin";

    if (!isOwner) {
        return next(new Error("Only the group owner can delete this group", { cause: 403 }));
    }

    group.isDeleted = true;
    await group.save();

    return successResponse({
        res,
        status: 200,
        message: "Group deleted successfully"
    });
});

/**
 * Toggle join or request to join a group.
 * Backward compatible with legacy toggleJoinGroup.
 * @route POST /group/:groupId/join | PATCH /group/:groupId/join
 */
export const toggleJoinGroup = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const existingMember = await groupMemberModel.findOne({
        groupId: group._id,
        userId
    });

    const isCreator =
        (group.creator?._id && group.creator._id.toString() === userId.toString()) ||
        (group.creator && group.creator.toString() === userId.toString());

    // 1. If currently an active member, leave group (or confirm owner)
    if (existingMember && existingMember.status === groupMemberStatus.active) {
        if (existingMember.role === groupMemberRoles.owner || isCreator) {
            return successResponse({
                res,
                status: 200,
                message: "You are the creator and owner of this group.",
                data: { isMember: true, memberRole: groupMemberRoles.owner, isPendingRequest: false }
            });
        }

        await groupMemberModel.deleteOne({ _id: existingMember._id });
        await groupModel.updateOne({ _id: group._id }, { $inc: { membersCount: -1 } });

        return successResponse({
            res,
            status: 200,
            message: "Left group successfully",
            data: { isMember: false, isPendingRequest: false }
        });
    }

    if (isCreator) {
        await groupMemberModel.findOneAndUpdate(
            { groupId: group._id, userId },
            {
                groupId: group._id,
                userId,
                role: groupMemberRoles.owner,
                status: groupMemberStatus.active,
                joinedAt: new Date()
            },
            { upsert: true, new: true }
        );
        return successResponse({
            res,
            status: 200,
            message: "You are the creator and owner of this group.",
            data: { isMember: true, memberRole: groupMemberRoles.owner, isPendingRequest: false }
        });
    }

    // 2. If banned, prevent joining
    if (existingMember && existingMember.status === groupMemberStatus.banned) {
        return next(new Error("You have been banned from this group", { cause: 403 }));
    }

    // 3. If group is Public: join directly
    if (group.privacy === groupPrivacyTypes.public) {
        await groupMemberModel.findOneAndUpdate(
            { groupId: group._id, userId },
            {
                groupId: group._id,
                userId,
                role: groupMemberRoles.member,
                status: groupMemberStatus.active,
                joinedAt: new Date()
            },
            { upsert: true, new: true }
        );

        await groupModel.updateOne({ _id: group._id }, { $inc: { membersCount: 1 } });

        return successResponse({
            res,
            status: 200,
            message: "Joined group successfully",
            data: { isMember: true, memberRole: groupMemberRoles.member, isPendingRequest: false }
        });
    }

    // 4. If group is Private: handle pending request
    const existingPending = await groupRequestModel.findOne({
        groupId: group._id,
        userId,
        status: groupRequestStatus.pending
    });

    if (existingPending) {
        // Toggle: cancel existing pending request
        await groupRequestModel.deleteOne({ _id: existingPending._id });
        return successResponse({
            res,
            status: 200,
            message: "Membership request cancelled",
            data: { isMember: false, isPendingRequest: false }
        });
    }

    // Create pending request
    const request = await groupRequestModel.create({
        groupId: group._id,
        userId,
        status: groupRequestStatus.pending
    });

    // Notify group owner & admins
    try {
        const admins = await groupMemberModel.find({
            groupId: group._id,
            role: { $in: [groupMemberRoles.owner, groupMemberRoles.admin] }
        });
        for (const admin of admins) {
            await createNotification({
                recipient: admin.userId,
                actor: userId,
                type: notificationTypes.group_request,
                entityId: group._id,
                entityType: "Group",
                message: `${req.user.username || 'A user'} requested to join ${group.name}.`
            });
        }
    } catch (err) {
        console.error("Failed to notify group admins:", err);
    }

    return successResponse({
        res,
        status: 200,
        message: "Membership request submitted for review",
        data: { isMember: false, isPendingRequest: true, requestId: request._id }
    });
});

/**
 * Retrieve pending membership requests for a private group (Admin/Moderator only).
 * @route GET /group/:groupId/requests
 */
export const getGroupRequests = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const group = await findGroupByIdOrSlug(groupId);

    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const membership = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    const isAuthorized = membership && [groupMemberRoles.owner, groupMemberRoles.admin, groupMemberRoles.moderator].includes(membership.role);
    if (!isAuthorized) {
        return next(new Error("Not authorized to review group requests", { cause: 403 }));
    }

    const requests = await groupRequestModel.find({
        groupId: group._id,
        status: groupRequestStatus.pending
    }).populate("userId", "username image firstName lastName email");

    return successResponse({
        res,
        status: 200,
        data: { requests }
    });
});

/**
 * Accept or reject a membership request (Admin/Moderator only).
 * @route PATCH /group/:groupId/requests/:requestId
 */
export const handleGroupRequest = asyncHandler(async (req, res, next) => {
    const { groupId, requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const reviewer = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    const isAuthorized = reviewer && [groupMemberRoles.owner, groupMemberRoles.admin, groupMemberRoles.moderator].includes(reviewer.role);
    if (!isAuthorized) {
        return next(new Error("Not authorized to review group requests", { cause: 403 }));
    }

    const request = await groupRequestModel.findOne({
        _id: requestId,
        groupId: group._id,
        status: groupRequestStatus.pending
    });

    if (!request) {
        return next(new Error("Pending request not found", { cause: 404 }));
    }

    if (action === "accept") {
        request.status = groupRequestStatus.approved;
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        await request.save();

        await groupMemberModel.findOneAndUpdate(
            { groupId: group._id, userId: request.userId },
            {
                groupId: group._id,
                userId: request.userId,
                role: groupMemberRoles.member,
                status: groupMemberStatus.active,
                joinedAt: new Date()
            },
            { upsert: true, new: true }
        );

        await groupModel.updateOne({ _id: group._id }, { $inc: { membersCount: 1 } });

        // Notify accepted user
        try {
            await createNotification({
                recipient: request.userId,
                actor: req.user._id,
                type: notificationTypes.group_approved,
                entityId: group._id,
                entityType: "Group",
                message: `Your request to join ${group.name} was approved!`
            });
        } catch (err) {
            console.error("Failed to notify user:", err);
        }

        return successResponse({
            res,
            status: 200,
            message: "Membership request approved successfully"
        });
    } else {
        request.status = groupRequestStatus.rejected;
        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        await request.save();

        return successResponse({
            res,
            status: 200,
            message: "Membership request declined"
        });
    }
});

/**
 * Retrieve members of a group with roles and joined dates.
 * @route GET /group/:groupId/members
 */
export const getGroupMembers = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const { page, size } = req.query;

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const data = await paginate({
        page,
        size,
        model: groupMemberModel,
        filter: { groupId: group._id, status: groupMemberStatus.active },
        populate: [{ path: "userId", select: "username image firstName lastName role" }]
    });

    data.members = data.data || [];
    data.posts = data.data || [];

    return successResponse({
        res,
        status: 200,
        data
    });
});

/**
 * Update member role within group (Owner & Admin only).
 * @route PATCH /group/:groupId/members/:userId/role
 */
export const updateMemberRole = asyncHandler(async (req, res, next) => {
    const { groupId, userId } = req.params;
    const { role } = req.body;

    if (!Object.values(groupMemberRoles).includes(role)) {
        return next(new Error("Invalid group role", { cause: 400 }));
    }

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const operator = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    if (!operator || operator.role !== groupMemberRoles.owner) {
        return next(new Error("Only the group owner can modify member roles", { cause: 403 }));
    }

    const member = await groupMemberModel.findOneAndUpdate(
        { groupId: group._id, userId },
        { role },
        { new: true }
    );

    return member
        ? successResponse({ res, status: 200, message: "Member role updated successfully", data: { member } })
        : next(new Error("Member not found in group", { cause: 404 }));
});

/**
 * Retrieve group posts feed.
 * Private groups require active membership.
 * @route GET /group/:groupId/posts
 */
export const getGroupPosts = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const { page, size } = req.query;

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    // Access check for private groups
    if (group.privacy === groupPrivacyTypes.private) {
        const isMember = req.user?._id && (await groupMemberModel.findOne({
            groupId: group._id,
            userId: req.user._id,
            status: groupMemberStatus.active
        }));

        if (!isMember) {
            return next(new Error("This is a private group. Join to view its feed.", { cause: 403 }));
        }
    }

    const data = await paginate({
        page,
        size,
        model: postModel,
        filter: {
            groupId: group._id,
            isDeleted: { $exists: false }
        },
        populate: postFullPopulate
    });

    if (data?.data?.length) {
        data.posts = data.data.map((p) => sanitizePostWithOriginal(p, req.user?._id));
    } else {
        data.posts = [];
    }

    return successResponse({
        res,
        status: 200,
        data
    });
});

/**
 * Create a new post inside a group (Member only).
 * @route POST /group/:groupId/posts
 */
export const createGroupPost = asyncHandler(async (req, res, next) => {
    const { groupId } = req.params;
    const { content, attachments } = req.body;

    const group = await findGroupByIdOrSlug(groupId);
    if (!group) {
        return next(new Error("Group not found", { cause: 404 }));
    }

    const membership = await groupMemberModel.findOne({
        groupId: group._id,
        userId: req.user._id,
        status: groupMemberStatus.active
    });

    const isCreator = group.creator?.toString() === req.user._id.toString();
    const isPlatformAdmin = req.user.role === "admin";

    if (!membership && !isCreator && !isPlatformAdmin) {
        return next(new Error("You must be an active member to post in this group", { cause: 403 }));
    }

    let postAttachments = Array.isArray(attachments) ? attachments : [];
    if (typeof attachments === "string") {
        try {
            postAttachments = JSON.parse(attachments);
        } catch {
            postAttachments = [{ secure_url: attachments }];
        }
    }
    const uploadedFiles = Array.isArray(req.files)
        ? req.files
        : (req.files && typeof req.files === "object")
        ? Object.values(req.files).flat()
        : req.file
        ? [req.file]
        : [];

    if (uploadedFiles.length) {
        for (const file of uploadedFiles) {
            const isVideo = file.mimetype?.startsWith('video');
            const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
                folder: `${process.env.APP_NAME || 'Social Media App'}/post`,
                resource_type: isVideo ? "video" : "auto"
            });
            postAttachments.push({ secure_url, public_id });
        }
    }

    const post = await postModel.create({
        content: content || "",
        attachments: postAttachments,
        privacy: postPrivacyTypes.group,
        groupId: group._id,
        createdBy: req.user._id
    });

    // Atomically increment group posts count
    await groupModel.updateOne({ _id: group._id }, { $inc: { postsCount: 1 } });

    const populated = await postModel.findById(post._id).populate(postFullPopulate);

    return successResponse({
        res,
        status: 201,
        message: "Group post published successfully",
        data: { post: sanitizePostWithOriginal(populated, req.user._id) }
    });
});
