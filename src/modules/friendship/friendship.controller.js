/**
 * @fileoverview Friendship Router
 * @module modules/friendship/friendship.controller
 * @description Exposes endpoints for sending, accepting, rejecting, cancelling friend requests,
 * managing friendships, and querying friends/requests lists.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./friendship.authorization.js";
import * as friendshipService from "./service/friendship.service.js";
import * as validators from "./friendship.validation.js";

const router = Router();

// Route: Get received pending friend requests (الطلبات الواردة)
router.get(
    "/received",
    authentication(),
    friendshipService.getReceivedRequests
);

// Route: Get sent pending friend requests (الطلبات المرسلة)
router.get(
    "/sent",
    authentication(),
    friendshipService.getSentRequests
);

// Route: Get my friends list (الأصدقاء)
router.get(
    "/friends",
    authentication(),
    friendshipService.getFriends
);

// Route: Get user's friends list
router.get(
    "/friends/:userId",
    authentication(),
    validation(validators.targetUser),
    friendshipService.getFriends
);

// Route: Get friendship status with a user
router.get(
    "/status/:userId",
    authentication(),
    validation(validators.targetUser),
    friendshipService.getFriendshipStatus
);

// Route: Send friend request (sendRequest - إرسال طلب صداقة)
router.post(
    "/request/:userId",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.targetUser),
    friendshipService.sendRequest
);

// Route: Accept friend request (acceptRequest - قبول طلب الصداقة)
router.patch(
    "/accept/:requestId",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.requestParam),
    friendshipService.acceptRequest
);

// Route: Reject friend request (rejectRequest - رفض الطلب)
router.patch(
    "/reject/:requestId",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.requestParam),
    friendshipService.rejectRequest
);

// Route: Cancel friend request (cancelRequest - إلغاء طلب الصداقة المرسل)
router.delete(
    "/cancel/:requestId",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.requestParam),
    friendshipService.cancelRequest
);

// Route: Remove friend (removeFriend - إزالة صديق)
router.delete(
    "/friend/:friendId",
    authentication(),
    authorization(endpoint.manage),
    validation(validators.friendParam),
    friendshipService.removeFriend
);

export default router;
