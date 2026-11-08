/**
 * @fileoverview User Authentication & Password Recovery Service
 * @module modules/auth/service/login.service
 * @description Implements credential validation, Google OAuth verification,
 * JWT token issuance/refreshing, and OTP-driven password resets.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { providerTypes, roleTypes, userModel } from "../../../DB/model/User.model.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { decodedToken, generateToken, tokenTypes } from "../../../utils/security/token.security.js";
import { OAuth2Client } from "google-auth-library";
import { emailEvent } from "../../../utils/events/email.event.js";

/**
 * Authenticates user credentials and generates access/refresh tokens.
 * @route POST /auth/login
 */
export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }));
    }

    if (user.isDeleted) {
        return next(new Error("Your account has been suspended or banned by an administrator", { cause: 403 }));
    }

    if (!user.confirmEmail) {
        return next(new Error("Please confirm your email first", { cause: 400 }));
    }

    if (!compareHash({ plainText: password, hashValue: user.password })) {
        return next(new Error("In-valid login data", { cause: 400 }));
    }

    // Role-based signing secret keys
    const access_signature = user.role === roleTypes.admin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN;
    const refresh_signature = user.role === roleTypes.admin ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN;

    const access_token = generateToken({
        payload: { id: user._id, role: user.role },
        signature: access_signature
    });

    const refresh_token = generateToken({
        payload: { id: user._id, role: user.role },
        signature: refresh_signature,
        expiresIn: 31536000
    });

    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;
    delete safeUser.confirmEmailOTP;
    delete safeUser.resetPasswordOTP;

    return successResponse({ res, data: { access_token, refresh_token, user: safeUser } });
});

/**
 * Authenticates user via Google OAuth 2.0 ID token.
 * Creates an account if not found or links existing Google account.
 * @route POST /auth/loginWithGmail
 */
export const loginWithGmail = asyncHandler(async (req, res, next) => {
    const { idToken } = req.body;
    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload.email_verified) {
        return next(new Error("In-valid google account", { cause: 400 }));
    }

    let user = await dbService.findOne({
        model: userModel,
        filter: { email: payload.email }
    });

    if (user?.provider === providerTypes.system) {
        return next(new Error("In-valid provider", { cause: 409 }));
    }

    if (user?.isDeleted) {
        return next(new Error("Your account has been suspended or banned by an administrator", { cause: 403 }));
    }

    if (!user) {
        user = await dbService.create({
            model: userModel,
            data: {
                username: payload.name,
                email: payload.email,
                image: { secure_url: payload.picture },
                confirmEmail: true,
                provider: providerTypes.google
            }
        });
    }

    const access_token = generateToken({
        payload: { id: user._id, role: user.role },
        signature: user.role === roleTypes.admin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
    });

    const refresh_token = generateToken({
        payload: { id: user._id, role: user.role },
        signature: user.role === roleTypes.admin ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
        expiresIn: 31536000
    });

    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;
    delete safeUser.confirmEmailOTP;
    delete safeUser.resetPasswordOTP;

    return successResponse({ res, data: { access_token, refresh_token, user: safeUser } });
});

/**
 * Issues a fresh access token using a valid refresh token.
 * @route GET /auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req, res, next) => {
    const user = await decodedToken({
        authorization: req.headers.authorization,
        tokenType: tokenTypes.refresh,
        next
    });

    const access_token = generateToken({
        payload: { id: user._id, role: user.role },
        signature: user.role === roleTypes.admin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
    });

    return successResponse({ res, data: { access_token } });
});

/**
 * Initiates password reset flow by emailing an OTP to the account.
 * @route PATCH /auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }));
    }

    emailEvent.emit("forgotPassword", { id: user._id, email });

    return successResponse({ res, data: {} });
});

/**
 * Validates the reset password OTP without updating the password yet.
 * @route PATCH /auth/validate-forgot-password
 */
export const validateForgotPassword = asyncHandler(async (req, res, next) => {
    const { email, code } = req.body;

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }));
    }

    if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
        return next(new Error("In-valid reset code", { cause: 400 }));
    }

    return successResponse({ res, data: {} });
});

/**
 * Resets account password and invalidates existing JWT sessions.
 * @route PATCH /auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
    const { email, code, password } = req.body;

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }));
    }

    if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
        return next(new Error("In-valid reset code", { cause: 400 }));
    }

    await dbService.updateOne({
        model: userModel,
        filter: { email },
        data: {
            password: generateHash({ plainText: password }),
            changeCredentialsTime: Date.now(),
            $unset: { resetPasswordOTP: 0 }
        }
    });

    return successResponse({ res, data: {} });
});
