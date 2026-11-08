/**
 * @fileoverview Groups Router
 * @module modules/group/group.controller
 * @description Exposes REST endpoints for community groups, memberships,
 * roles, join requests, and group discussions.
 */

import { Router } from "express";
import { authentication, optionalAuthentication } from "../../middleware/auth.middleware.js";
import { fileValidations, uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import * as groupService from "./group.service.js";

const router = Router();

// Route: Get paginated public groups
router.get("/", optionalAuthentication(), groupService.getGroups);

// Route: Get current user's groups
router.get("/my", authentication(), groupService.getMyGroups);

// Route: Create new group
router.post("/", authentication(), groupService.createGroup);

// Route: Get group details by ID or slug
router.get("/:groupId", optionalAuthentication(), groupService.getGroupById);

// Route: Update group settings (Owner/Admin)
router.patch("/:groupId", authentication(), groupService.updateGroup);

// Route: Delete group (Owner only)
router.delete("/:groupId", authentication(), groupService.deleteGroup);

// Route: Join / Leave / Request to join group
router.post("/:groupId/join", authentication(), groupService.toggleJoinGroup);
router.patch("/:groupId/join", authentication(), groupService.toggleJoinGroup);

// Route: Get pending membership requests (Owner/Admin/Mod)
router.get("/:groupId/requests", authentication(), groupService.getGroupRequests);

// Route: Approve or reject membership request
router.patch("/:groupId/requests/:requestId", authentication(), groupService.handleGroupRequest);

// Route: List group members
router.get("/:groupId/members", optionalAuthentication(), groupService.getGroupMembers);

// Route: Update member role (Owner only)
router.patch("/:groupId/members/:userId/role", authentication(), groupService.updateMemberRole);

// Route: Get group feed posts
router.get("/:groupId/posts", optionalAuthentication(), groupService.getGroupPosts);

// Route: Create post in group with optional file attachments
router.post(
  "/:groupId/posts",
  authentication(),
  uploadCloudFile(fileValidations.media).fields([
    { name: 'attachments', maxCount: 5 },
    { name: 'file', maxCount: 2 },
    { name: 'image', maxCount: 2 }
  ]),
  groupService.createGroupPost
);

export default router;
