/**
 * @fileoverview Story Router
 * @module modules/story/story.controller
 * @description Exposes endpoints for creating, viewing, and deleting stories.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import { endpoint } from "./story.authorization.js";
import * as storyService from "./service/story.service.js";
import * as validators from "./story.validation.js";
import { fileValidations, uploadCloudFile } from "../../utils/multer/cloud.multer.js";

const router = Router();

// Route: Create a story (image or text)
router.post(
    "/",
    authentication(),
    authorization(endpoint.create),
    uploadCloudFile([...fileValidations.image, 'video/mp4', 'video/quicktime']).single("file"),
    validation(validators.createStory),
    storyService.createStory
);

// Route: Get authenticated user's own stories
router.get(
    "/me",
    authentication(),
    storyService.getMyStories
);

// Route: Get story feed from followed users
router.get(
    "/feed",
    authentication(),
    storyService.getFollowingStories
);

// Route: React to a story (emoji reaction & notification)
router.post(
    "/:storyId/react",
    authentication(),
    validation(validators.reactToStory),
    storyService.reactToStory
);

// Route: Reply to a story (direct message & notification)
router.post(
    "/:storyId/reply",
    authentication(),
    validation(validators.replyToStory),
    storyService.replyToStory
);

// Route: View a story by ID (auto records view)
router.get(
    "/:storyId",
    authentication(),
    validation(validators.storyId),
    storyService.getStory
);

// Route: Delete own story
router.delete(
    "/:storyId",
    authentication(),
    authorization(endpoint.delete),
    validation(validators.storyId),
    storyService.deleteStory
);

// Route: Get viewers list of a story (owner only)
router.get(
    "/:storyId/viewers",
    authentication(),
    validation(validators.storyId),
    storyService.getStoryViewers
);

export default router;

