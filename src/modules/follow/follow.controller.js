/**
 * @fileoverview Follow Router
 * @module modules/follow/follow.controller
 * @description Exposes endpoints for following, unfollowing, blocking users,
 * managing follow requests, and retrieving follower/following lists.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./follow.authorization.js";
import * as followService from "./service/follow.service.js";
import * as validators from "./follow.validation.js";

const router = Router();

// Route: Get authenticated user's pending follow requests
router.get(
    "/requests",
    authentication(),
    followService.getFollowRequests
);

// Route: Handle (accept/reject) a follow request
router.patch(
    "/requests/:followId",
    authentication(),
    validation(validators.followRequest),
    followService.handleFollowRequest
);

// Route: Get authenticated user's blocked users list
router.get(
    "/blocked",
    authentication(),
    followService.getBlockedUsers
);

// Route: Follow a user
router.post(
    "/:userId",
    authentication(),
    authorization(endpoint.follow),
    validation(validators.targetUser),
    followService.followUser
);

// Route: Unfollow a user
router.delete(
    "/:userId",
    authentication(),
    authorization(endpoint.follow),
    validation(validators.targetUser),
    followService.unfollowUser
);

// Route: Get followers of a user
router.get(
    "/:userId/followers",
    authentication(),
    validation(validators.targetUser),
    followService.getFollowers
);

// Route: Get following list of a user
router.get(
    "/:userId/following",
    authentication(),
    validation(validators.targetUser),
    followService.getFollowing
);

// Route: Get follower/following counts
router.get(
    "/:userId/counts",
    validation(validators.targetUser),
    followService.getFollowCounts
);

// Route: Check if authenticated user follows a specific user
router.get(
    "/:userId/status",
    authentication(),
    validation(validators.targetUser),
    followService.checkFollowStatus
);

// Route: Block a user
router.post(
    "/:userId/block",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.targetUser),
    followService.blockUser
);

// Route: Unblock a user
router.delete(
    "/:userId/block",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.targetUser),
    followService.unblockUser
);

export default router;

