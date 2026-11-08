/**
 * @fileoverview User Registration Service
 * @module modules/auth/service/registration.service
 * @description Handles account sign-up and email confirmation with hashed OTP verification.
 */

import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { userModel } from "../../../DB/model/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { compareHash } from "../../../utils/security/hash.security.js";

/**
 * Registers a new user account and dispatches an OTP verification email.
 * @route POST /auth/signup
 */
export const signup = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Verify email uniqueness
    if (await dbService.findOne({ model: userModel, filter: { email } })) {
        return next(new Error("Email already exists", { cause: 409 }));
    }

    // Create user document (password hashed in pre-save hook)
    const user = await dbService.create({
        model: userModel,
        data: {
            username,
            email,
            password
        }
    });

    // Trigger async email verification event
    emailEvent.emit("sendConfirmEmail", { id: user._id, email });

    return successResponse({ res, status: 201, data: { user } });
});

/**
 * Verifies the user's OTP code and activates the account.
 * @route PATCH /auth/confirmEmail
 */
export const confirmEmail = asyncHandler(async (req, res, next) => {
    const { email, code } = req.body;

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    if (!user) {
        return next(new Error("In-valid account", { cause: 404 }));
    }

    if (user.confirmEmail) {
        return next(new Error("Already confirmed", { cause: 409 }));
    }

    if (!compareHash({ plainText: code, hashValue: user.confirmEmailOTP })) {
        return next(new Error("In-valid code", { cause: 400 }));
    }

    // Mark confirmed and clean up OTP
    await dbService.updateOne({
        model: userModel,
        filter: { email },
        data: {
            confirmEmail: true,
            $unset: { confirmEmailOTP: 0 }
        }
    });

    return successResponse({ res, data: {} });
});

// In-memory rate limiting map for resending verification codes: email -> { count, firstSentAt }
const resendRateLimitMap = new Map();

/**
 * Resends a fresh OTP code for email verification.
 * Enforces rate limiting (max 5 attempts per hour), invalidates old OTP, and masks email presence for security.
 * @route PATCH /auth/resend-code
 */
export const resendConfirmEmail = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    // Rate limiting check (max 5 resends per hour per email)
    const rateRecord = resendRateLimitMap.get(email.toLowerCase());
    if (rateRecord) {
        if (now - rateRecord.firstSentAt < ONE_HOUR) {
            if (rateRecord.count >= 5) {
                return next(new Error("Too many resend attempts. Please try again after 1 hour.", { cause: 429 }));
            }
            rateRecord.count += 1;
        } else {
            // Reset window
            resendRateLimitMap.set(email.toLowerCase(), { count: 1, firstSentAt: now });
        }
    } else {
        resendRateLimitMap.set(email.toLowerCase(), { count: 1, firstSentAt: now });
    }

    const user = await dbService.findOne({
        model: userModel,
        filter: { email }
    });

    // Security check: If account doesn't exist, respond gracefully without leaking registration state
    if (!user) {
        return successResponse({
            res,
            message: "If this email is registered, a new verification code has been sent."
        });
    }

    if (user.confirmEmail) {
        return next(new Error("Email is already confirmed. Please log in directly.", { cause: 409 }));
    }

    // Trigger async email verification event which creates a fresh OTP and overwrites the old one
    emailEvent.emit("sendConfirmEmail", { id: user._id, email: user.email });

    return successResponse({
        res,
        message: "A new verification code has been sent to your email."
    });
});
