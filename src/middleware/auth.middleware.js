/**
 * @fileoverview Authentication & Authorization Middlewares
 * @module middleware/auth.middleware
 * @description Verifies JWT bearer tokens, attaches authenticated user to req.user,
 * and enforces role-based access control (RBAC).
 */

import { asyncHandler } from "../utils/response/error.response.js";
import { decodedToken } from "../utils/security/token.security.js";

/**
 * Authentication middleware factory
 * Validates the Authorization header token, verifies credentials, and attaches user document to req.user.
 * @returns {import('express').RequestHandler} Express request handler
 */
export const authentication = () => {
    return asyncHandler(async (req, res, next) => {
        const { authorization } = req.headers;
        req.user = await decodedToken({ authorization, next });
        return next();
    });
};

/**
 * Optional authentication middleware: if Authorization header is supplied,
 * extracts user; if missing or invalid, proceeds without failing.
 */
export const optionalAuthentication = () => {
    return asyncHandler(async (req, res, next) => {
        const { authorization } = req.headers;
        if (authorization) {
            try {
                req.user = await decodedToken({ authorization, next });
            } catch {
                // Ignore token error for optional auth
            }
        }
        return next();
    });
};

/**
 * Authorization middleware factory for Role-Based Access Control (RBAC)
 * Compares authenticated user's role against allowed access roles.
 * @param {Array<string>} [accessRoles=[]] - Allowed user roles for the route
 * @returns {import('express').RequestHandler} Express request handler
 */
export const authorization = (accessRoles = []) => {
    return asyncHandler(async (req, res, next) => {
        if (!accessRoles.includes(req.user.role)) {
            return next(new Error("Not Authorized account", { cause: 403 }));
        }
        return next();
    });
};
