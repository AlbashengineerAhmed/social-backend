/**
 * @fileoverview Admin Router
 * @module modules/admin/admin.controller
 * @description Admin dashboard, user management, content moderation, and report handling.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./admin.authorization.js";
import * as adminService from "./service/admin.service.js";
import * as validators from "./admin.validation.js";
import { roleTypes } from "../../DB/model/User.model.js";
import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { reportTargetTypes, reportReasonTypes } from "../../DB/model/Report.model.js";

const router = Router();

// ---- Dashboard ----
router.get(
    "/dashboard",
    authentication(),
    authorization(endpoint.dashboard),
    adminService.getDashboard
);

// ---- User Management ----
router.get(
    "/users",
    authentication(),
    authorization(endpoint.manageUsers),
    adminService.listUsers
);

router.get(
    "/users/:userId",
    authentication(),
    authorization(endpoint.manageUsers),
    validation(validators.userId),
    adminService.getUserDetails
);

router.patch(
    "/users/:userId/ban",
    authentication(),
    authorization(endpoint.manageUsers),
    validation(validators.userId),
    adminService.banUser
);

router.patch(
    "/users/:userId/unban",
    authentication(),
    authorization(endpoint.manageUsers),
    validation(validators.userId),
    adminService.unbanUser
);

router.patch(
    "/users/:userId/role",
    authentication(),
    authorization(endpoint.manageUsers),
    validation(validators.updateUserRole),
    adminService.changeUserRole
);

router.delete(
    "/users/:userId",
    authentication(),
    authorization(endpoint.manageUsers),
    validation(validators.userId),
    adminService.deleteUser
);

// ---- Content Management ----
router.get(
    "/posts",
    authentication(),
    authorization(endpoint.managePosts),
    adminService.listPosts
);

router.delete(
    "/posts/:postId",
    authentication(),
    authorization(endpoint.managePosts),
    validation(validators.postId),
    adminService.adminDeletePost
);

router.patch(
    "/posts/:postId/hide",
    authentication(),
    authorization(endpoint.managePosts),
    validation(validators.postId),
    adminService.hidePost
);

router.patch(
    "/posts/:postId/unhide",
    authentication(),
    authorization(endpoint.managePosts),
    validation(validators.postId),
    adminService.unhidePost
);

router.delete(
    "/comments/:commentId",
    authentication(),
    authorization(endpoint.managePosts),
    validation(validators.commentId),
    adminService.adminDeleteComment
);

// ---- Reports System ----

// Submit report (any authenticated user)
router.post(
    "/reports",
    authentication(),
    validation(joi.object({
        targetType: joi.string().valid(...Object.values(reportTargetTypes)).required(),
        targetId: generalFields.id.required(),
        reason: joi.string().valid(...Object.values(reportReasonTypes)).required(),
        description: joi.string().max(500)
    })),
    adminService.submitReport
);

router.get(
    "/reports",
    authentication(),
    authorization(endpoint.manageReports),
    adminService.getReports
);

router.patch(
    "/reports/:reportId",
    authentication(),
    authorization(endpoint.manageReports),
    validation(validators.reviewReport),
    adminService.reviewReport
);

// ---- Group Management ----
router.get(
    "/groups",
    authentication(),
    authorization(endpoint.managePosts),
    adminService.listGroups
);

router.delete(
    "/groups/:groupId",
    authentication(),
    authorization(endpoint.managePosts),
    validation(validators.groupId),
    adminService.deleteGroup
);

export default router;

