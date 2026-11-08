/**
 * @fileoverview JWT Token Generation, Verification & Decoding Service
 * @module utils/security/token.security
 * @description Manages JsonWebToken creation, verification, and bearer-aware authorization header parsing.
 */

import jwt from "jsonwebtoken";
import { userModel } from "../../DB/model/User.model.js";
import * as dbService from "../../DB/db.service.js";

/**
 * Supported token types
 * @readonly
 * @enum {string}
 */
export const tokenTypes = {
    access: "access",
    refresh: "refresh"
};

/**
 * Signs and generates a JWT string with payload, signature, and expiration.
 * @param {Object} options
 * @param {Object} [options.payload={}] - Claims payload
 * @param {string} [options.signature=process.env.USER_ACCESS_TOKEN] - Signing secret key
 * @param {number|string} [options.expiresIn=parseInt(process.env.EXPIRESIN)] - Token lifespan in seconds or zeit/ms string
 * @returns {string} Generated JWT token
 */
export const generateToken = ({
    payload = {},
    signature = process.env.USER_ACCESS_TOKEN,
    expiresIn = parseInt(process.env.EXPIRESIN)
} = {}) => {
    const token = jwt.sign(payload, signature, { expiresIn });
    return token;
};

/**
 * Verifies a JWT token using the provided secret key.
 * @param {Object} options
 * @param {string} [options.token=""] - JWT token to verify
 * @param {string} [options.signature=process.env.USER_ACCESS_TOKEN] - Verification secret key
 * @returns {Object} Decoded payload
 */
export const verifyToken = ({
    token = "",
    signature = process.env.USER_ACCESS_TOKEN
} = {}) => {
    const decoded = jwt.verify(token, signature);
    return decoded;
};

/**
 * Decodes and authenticates a user token from the Authorization header.
 * Inspects bearer prefix ('System' vs 'Bearer'), verifies signature, checks user existence and credential invalidation time.
 * @param {Object} options
 * @param {string} [options.authorization=""] - Authorization header value (e.g. "Bearer <token>" or "System <token>")
 * @param {string} [options.tokenType=tokenTypes.access] - Expected token type (access or refresh)
 * @param {import('express').NextFunction} [options.next] - Express next error handler
 * @returns {Promise<import('mongoose').Document>} Authenticated user document
 */
export const decodedToken = async ({
    authorization = "",
    tokenType = tokenTypes.access,
    next = () => {}
} = {}) => {
    const [bearer, token] = authorization?.split(" ") || [];
    if (!bearer || !token) {
        return next(new Error("authorization is required or In-valid format", { cause: 400 }));
    }

    let access_signature = '';
    let refresh_signature = '';
    switch (bearer) {
        case "System":
            access_signature = process.env.ADMIN_ACCESS_TOKEN;
            refresh_signature = process.env.ADMIN_REFRESH_TOKEN;
            break;
        case "Bearer":
            access_signature = process.env.USER_ACCESS_TOKEN;
            refresh_signature = process.env.USER_REFRESH_TOKEN;
            break;
        default:
            break;
    }

    const signature = tokenType === tokenTypes.access ? access_signature : refresh_signature;
    if (!signature) {
        return next(new Error("In-valid token bearer", { cause: 400 }));
    }

    const decoded = verifyToken({ token, signature });
    if (!decoded?.id) {
        return next(new Error("In-valid token payload", { cause: 401 }));
    }

    const user = await dbService.findOne({
        model: userModel,
        filter: { _id: decoded.id }
    });
    if (!user) {
        return next(new Error("Not registered account", { cause: 404 }));
    }

    if (user.isDeleted) {
        return next(new Error("Your account has been suspended or banned by an administrator", { cause: 403 }));
    }

    if (user.changeCredentialsTime?.getTime() >= decoded.iat * 1000) {
        return next(new Error("In-valid login credentials", { cause: 400 }));
    }

    return user;
};
