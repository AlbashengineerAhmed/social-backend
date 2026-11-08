/**
 * @fileoverview User Profile Business Service
 * @module modules/user/service/user.service
 * @description Implements business logic for retrieving user profile, recording profile viewers,
 * updating credentials, managing Cloudinary avatar/covers, and admin dashboard metrics.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { roleTypes, userModel } from "../../../DB/model/User.model.js";
import { postModel } from "../../../DB/model/Post.model.js";
import { followModel, followStatusTypes } from "../../../DB/model/Follow.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";

/**
 * Retrieves aggregate platform data for administrative dashboard.
 * @route GET /user/dashboard
 */
export const dashboard = asyncHandler(async (req, res, next) => {
    const users = await dbService.find({
        model: userModel,
        filter: {},
        populate: [{
            path: "viewers.userId",
            select: "username image"
        }]
    });

    const posts = await dbService.find({
        model: postModel,
        filter: {}
    });

    return successResponse({ res, data: { users, posts } });
});

/**
 * Adjusts user role permissions with hierarchy enforcement.
 * @route PATCH /user/change-roles/:userId
 */
export const changeRoles = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { role } = req.body;

    const roles = req.user.role === roleTypes.superAdmin
        ? { role: { $nin: [roleTypes.superAdmin] } }
        : { role: { $nin: [roleTypes.admin, roleTypes.superAdmin] } };

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: {
            _id: userId,
            isDeleted: { $exists: false },
            ...roles
        },
        data: { role },
        options: { new: true }
    });

    return user
        ? successResponse({ res, data: { user } })
        : next(new Error("In-valid user or unauthorized to change this user", { cause: 400 }));
});

/**
 * Returns authenticated user's profile with populated viewers.
 * @route GET /user/profile
 */
export const getProfile = asyncHandler(async (req, res, next) => {
    const [user, followersCount, followingCount, postsCount] = await Promise.all([
        dbService.findOne({
            model: userModel,
            filter: { _id: req.user._id },
            populate: [{
                path: "viewers.userId",
                select: "username image"
            }]
        }),
        followModel.countDocuments({ following: req.user._id, status: followStatusTypes.accepted }),
        followModel.countDocuments({ follower: req.user._id, status: followStatusTypes.accepted }),
        postModel.countDocuments({ createdBy: req.user._id, isDeleted: { $exists: false } })
    ]);

    if (!user) return next(new Error("User not found", { cause: 404 }));

    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.followersCount = followersCount;
    userObj.followingCount = followingCount;
    userObj.postsCount = postsCount;

    return successResponse({ res, data: { user: userObj } });
});

/**
 * Fetches another user's public profile and logs the profile visit.
 * @route GET /user/profile/:profileId
 */
export const shareProfile = asyncHandler(async (req, res, next) => {
    const { profileId } = req.params;

    const [user, followersCount, followingCount, postsCount] = await Promise.all([
        dbService.findOneAndUpdate({
            model: userModel,
            filter: {
                _id: profileId,
                isDeleted: false
            },
            data: {
                $push: {
                    viewers: {
                        userId: req.user._id,
                        time: Date.now()
                    }
                }
            },
            select: "username firstName lastName image coverImages phone email address bio role createdAt",
            options: { new: true }
        }),
        followModel.countDocuments({ following: profileId, status: followStatusTypes.accepted }),
        followModel.countDocuments({ follower: profileId, status: followStatusTypes.accepted }),
        postModel.countDocuments({ createdBy: profileId, isDeleted: { $exists: false } })
    ]);

    if (!user) return next(new Error("In-valid account", { cause: 404 }));

    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.followersCount = followersCount;
    userObj.followingCount = followingCount;
    userObj.postsCount = postsCount;

    return successResponse({ res, data: { user: userObj } });
});

/**
 * Updates basic profile properties (username, phone, address, DOB, gender).
 * @route PATCH /user/profile
 */
export const updateProfile = asyncHandler(async (req, res, next) => {
    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: { _id: req.user._id },
        data: req.body,
        options: { new: true }
    });

    return successResponse({ res, data: { user } });
});

/**
 * Uploads a new profile image to Cloudinary and purges any previous image.
 * @route PATCH /user/profile/image
 */
export const updateProfileImage = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        return next(new Error("Please select an image to upload", { cause: 400 }));
    }

    const { secure_url, public_id } = await cloud.uploader.upload(req.file.path, {
        folder: `${process.env.APP_NAME}/user/${req.user._id}/profile`
    });

    const oldUser = await userModel.findById(req.user._id);

    // Delete old avatar from Cloudinary if existed
    if (oldUser?.image?.public_id) {
        try {
            await cloud.uploader.destroy(oldUser.image.public_id);
        } catch (err) {
            // Ignore purge error
        }
    }

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: { _id: req.user._id },
        data: {
            image: { secure_url, public_id }
        },
        options: { new: true }
    });

    return successResponse({ res, data: { user, image: { secure_url, public_id } } });
});

/**
 * Uploads multiple cover photos to Cloudinary.
 * @route PATCH /user/profile/cover
 */
export const updateProfileCoverImage = asyncHandler(async (req, res, next) => {
    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
        return next(new Error("Please select an image file to upload as cover", { cause: 400 }));
    }

    const coverImages = [];
    for (const file of files) {
        const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
            folder: `${process.env.APP_NAME}/user/${req.user._id}/cover`
        });
        coverImages.push({ secure_url, public_id });
    }

    const user = await dbService.findOneAndUpdate({
        model: userModel,
        filter: { _id: req.user._id },
        data: { coverImages },
        options: { new: true }
    });

    return successResponse({ res, data: { user, coverImages } });
});

/**
 * Initiates an email address change by emailing verification OTPs to both addresses.
 * @route PATCH /user/profile/email
 */
export const updateEmail = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (await dbService.findOne({ model: userModel, filter: { email } })) {
        return next(new Error("Email exist", { cause: 409 }));
    }

    await dbService.updateOne({
        model: userModel,
        filter: { _id: req.user._id },
        data: { tempEmail: email }
    });

    emailEvent.emit("sendConfirmEmail", { id: req.user._id, email: req.user.email });
    emailEvent.emit("sendUpdateEmail", { id: req.user._id, email });

    return successResponse({ res, data: {} });
});

/**
 * Confirms both OTP codes and completes the email update.
 * @route PATCH /user/profile/email/reset
 */
export const resetEmail = asyncHandler(async (req, res, next) => {
    const { oldCode, newCode } = req.body;

    if (
        !compareHash({ plainText: oldCode, hashValue: req.user.confirmEmailOTP }) ||
        !compareHash({ plainText: newCode, hashValue: req.user.tempEmailOTP })
    ) {
        return next(new Error("In-valid provided codes", { cause: 400 }));
    }

    await dbService.updateOne({
        model: userModel,
        filter: { _id: req.user._id },
        data: {
            email: req.user.tempEmail,
            changeCredentialsTime: Date.now(),
            $unset: { tempEmail: 0, tempEmailOTP: 0 }
        }
    });

    return successResponse({ res, data: {} });
});

/**
 * Updates account password after verifying the old password.
 * @route PATCH /user/profile/password
 */
export const updatePassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, password } = req.body;

    if (!compareHash({ plainText: oldPassword, hashValue: req.user.password })) {
        return next(new Error("In-valid old password", { cause: 400 }));
    }

    await dbService.updateOne({
        model: userModel,
        filter: { _id: req.user._id },
        data: {
            password: generateHash({ plainText: password }),
            changeCredentialsTime: Date.now()
        }
    });

    return successResponse({ res, data: {} });
});

/**
 * Retrieves dynamic list of registered users for recommendations/who-to-follow.
 * Checks following status against the current user.
 * @route GET /user/suggestions
 */
export const getSuggestions = asyncHandler(async (req, res, next) => {
    const currentUserId = req.user._id;

    // Retrieve other registered users
    const users = await dbService.find({
        model: userModel,
        filter: {
            _id: { $ne: currentUserId },
            isDeleted: { $ne: true }
        },
        select: "username firstName lastName email image role createdAt",
        limit: 30
    });

    // Check which users current user is already following
    const userIds = users.map(u => u._id);
    const follows = await dbService.find({
        model: followModel,
        filter: {
            follower: currentUserId,
            following: { $in: userIds }
        }
    });

    const followingSet = new Set(follows.map(f => f.following.toString()));

    const suggestedUsers = users.map(u => {
        const displayName = u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email.split('@')[0];
        return {
            _id: u._id,
            id: u._id,
            username: displayName,
            name: displayName,
            email: u.email,
            role: u.role === 'admin' ? 'Admin' : u.role === 'superAdmin' ? 'Super Admin' : 'Member',
            avatar: u.image?.secure_url || '/assets/images/avatar/01.jpg',
            isFollowing: followingSet.has(u._id.toString()),
            createdAt: u.createdAt
        };
    });

    return successResponse({ res, data: { users: suggestedUsers } });
});
