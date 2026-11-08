/**
 * @fileoverview Authentication Router
 * @module modules/auth/auth.controller
 * @description Exposes endpoints for account registration, email confirmation,
 * user login, Google OAuth login, token refreshing, and password reset workflows.
 */

import { Router } from "express";
import { validation } from "../../middleware/validation.middleware.js";
import * as registrationService from "./service/registration.service.js";
import * as loginService from "./service/login.service.js";
import * as validators from "./auth.validation.js";

const router = Router();

// Route: Register new user account
router.post("/signup", validation(validators.signup), registrationService.signup);

// Route: Confirm registered email address using OTP
router.patch("/confirmEmail", validation(validators.confirmEmail), registrationService.confirmEmail);

// Route: Resend verification OTP code
router.patch("/resend-code", validation(validators.resendCode), registrationService.resendConfirmEmail);
router.patch("/resendConfirmEmail", validation(validators.resendCode), registrationService.resendConfirmEmail);

// Route: Authenticate credentials and receive access/refresh tokens
router.post("/login", validation(validators.login), loginService.login);

// Route: Social login via Google OAuth id_token
router.post("/loginWithGmail", validation(validators.loginWithGmail), loginService.loginWithGmail);

// Route: Rotate and refresh user access token
router.get("/refresh-token", loginService.refreshToken);

// Route: Request password reset OTP code
router.patch("/forgot-password", validation(validators.forgotPassword), loginService.forgotPassword);

// Route: Validate password reset OTP code
router.patch("/validate-forgot-password", validation(validators.validateForgotPassword), loginService.validateForgotPassword);

// Route: Set new password using validated OTP code
router.patch("/reset-password", validation(validators.resetPassword), loginService.resetPassword);

export default router;
