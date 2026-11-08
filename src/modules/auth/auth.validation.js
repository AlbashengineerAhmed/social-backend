/**
 * @fileoverview Authentication Validation Schemas
 * @module modules/auth/auth.validation
 * @description Defines Joi schemas for validating request payloads for all authentication endpoints.
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

/** Schema for user registration */
export const signup = joi.object().keys({
    username: generalFields.username.required(),
    email: generalFields.email.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref('password')).required()
}).required();

/** Schema for account confirmation OTP */
export const confirmEmail = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required()
}).required();

/** Schema for resending confirmation OTP */
export const resendCode = joi.object().keys({
    email: generalFields.email.required()
}).required();

/** Schema for email/password login */
export const login = joi.object().keys({
    email: generalFields.email.required(),
    password: joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
}).required();

/** Schema for Google OAuth token login */
export const loginWithGmail = joi.object().keys({
    idToken: joi.string().required()
}).required();

/** Schema for forgot password request */
export const forgotPassword = joi.object().keys({
    email: generalFields.email.required()
}).required();

/** Schema for verifying forgot password OTP */
export const validateForgotPassword = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required()
}).required();

/** Schema for resetting password with OTP */
export const resetPassword = joi.object().keys({
    email: generalFields.email.required(),
    code: generalFields.code.required(),
    password: generalFields.password.required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref('password')).required()
}).required();
