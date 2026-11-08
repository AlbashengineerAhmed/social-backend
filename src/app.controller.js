/**
 * @fileoverview Application Bootstrap Controller
 * @module app.controller
 * @description Configures global middlewares (CORS, Helmet, Rate Limiter, Body Parser, Static Files),
 * establishes Database connection, mounts application routers, and registers global 404 & error handling.
 */

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import connectDB from './DB/connection.js';
import authController from './modules/auth/auth.controller.js';
import userController from './modules/user/user.controller.js';
import postController from './modules/post/post.controller.js';
import followController from './modules/follow/follow.controller.js';
import reactionController from './modules/reaction/reaction.controller.js';
import storyController from './modules/story/story.controller.js';
import notificationController from './modules/notification/notification.controller.js';
import adminController from './modules/admin/admin.controller.js';
import feedController from './modules/feed/feed.controller.js';
import chatController from './modules/chat/chat.controller.js';
import groupController from './modules/group/group.controller.js';
import eventController from './modules/event/event.controller.js';
import friendshipController from './modules/friendship/friendship.controller.js';
import supportController from './modules/support/support.controller.js';
import musicController from './modules/music/music.controller.js';
import { globalErrorHandling } from './utils/response/error.response.js';

/**
 * Global Rate Limiter configuration
 * Limits requests per IP within a specified window.
 */
const limiter = rateLimit({
    limit: process.env.MOOD === "DEV" ? 10000 : 300,
    windowMs: 15 * 60 * 1000,
    message: { message: "Too many requests, please try again later." },
    statusCode: 429,
    legacyHeaders: true,
    standardHeaders: 'draft-8'
});

/**
 * Bootstrap function to attach middleware, database, routes, and error handling to the express app.
 * @param {import('express').Application} app - Express application instance
 * @param {typeof import('express')} express - Express module reference
 */
const bootstrap = (app, express) => {
    // 1. CORS first: dynamically reflects origin and supports credentials cleanly in 3 lines
    app.use(cors({ origin: true, credentials: true }));

    // 2. Helmet: allows loading cross-origin static assets (images, avatars)
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

    // 3. Security & Body Parsers
    app.use(limiter);
    app.use("/uploads", express.static(path.resolve("./src/uploads")));
    app.use(express.json());

    // 4. Database Initialization
    connectDB();

    // 5. Root Health Check / Welcome Endpoint
    app.get("/", (req, res, next) => {
        return res.status(200).json({ message: "Welcome in node.js project powered by express and ES6" });
    });

    // 6. Application Routers
    app.use("/auth", authController);
    app.use("/user", userController);
    app.use("/post", postController);
    app.use("/follow", followController);
    app.use("/reaction", reactionController);
    app.use("/story", storyController);
    app.use("/notification", notificationController);
    app.use("/admin", adminController);
    app.use("/feed", feedController);
    app.use("/chat", chatController);
    app.use("/group", groupController);
    app.use("/event", eventController);
    app.use("/friendship", friendshipController);
    app.use("/support", supportController);
    app.use("/music", musicController);

    // 7. Undefined Route Handler (404 Fallback)
    app.all("*", (req, res, next) => {
        return res.status(404).json({ message: "In-valid routing" });
    });

    // 8. Global Centralized Error Handling Middleware
    app.use(globalErrorHandling);
};

export default bootstrap;
