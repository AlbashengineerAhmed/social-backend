/**
 * @fileoverview Feed & Search Router
 * @module modules/feed/feed.controller
 * @description Endpoints for following feed, public feed, trending posts, popular users, and search.
 */

import { Router } from "express";
import { authentication, optionalAuthentication } from "../../middleware/auth.middleware.js";
import * as feedService from "./service/feed.service.js";

const router = Router();

// Route: Get authenticated user's following feed
router.get("/", authentication(), feedService.getFollowingFeed);

// Route: Get public feed (all public posts)
router.get("/public", optionalAuthentication(), feedService.getPublicFeed);

// Route: Get trending posts sorted by likes
router.get("/trending", feedService.getTrendingPosts);

// Route: Get popular users sorted by follower count
router.get("/popular-users", feedService.getPopularUsers);

// Route: Search users by name/username
router.get("/search/users", feedService.searchUsers);

// Route: Search posts by content
router.get("/search/posts", feedService.searchPosts);

export default router;

