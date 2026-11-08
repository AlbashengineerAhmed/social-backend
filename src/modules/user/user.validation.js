/**
 * @fileoverview User Profile Validation Schemas
 * @module modules/user/user.validation
 * @description Defines Joi schemas for validating user profile updates, passwords, and role changes.
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { genderTypes, roleTypes } from "../../DB/model/User.model.js";

/** Validation for fetching shared profile */
export const shareProfile = joi.object().keys({
    profileId: generalFields.id.required()
}).required();

/** Validation for updating profile information */
export const updateProfile = joi.object().keys({
    username: generalFields.username,
    phone: joi.string().pattern(new RegExp(/^(010|011|012|015)\d{8}$/)),
    address: joi.string().min(5).max(100),
    DOB: joi.date().less("now"),
    gender: joi.string().valid(...Object.values(genderTypes))
}).required();

/** Validation for initiating email update */
export const updateEmail = joi.object().keys({
    email: generalFields.email.required()
}).required();

/** Validation for confirming email update with OTP codes */
export const resetEmail = joi.object().keys({
    oldCode: generalFields.code.required(),
    newCode: generalFields.code.required()
}).required();

/** Validation for updating account password */
export const updatePassword = joi.object().keys({
    oldPassword: generalFields.password.required(),
    password: generalFields.password.not(joi.ref('oldPassword')).required(),
    confirmationPassword: generalFields.confirmationPassword.valid(joi.ref('password')).required()
}).required();

/** Validation for profile image upload */
export const profileImage = joi.object().keys({
    file: generalFields.file
}).required();

/** Validation for admin modifying user roles */
export const changeRoles = joi.object().keys({
    userId: generalFields.id.required(),
    role: joi.string().valid(...Object.values(roleTypes)).required()
}).required();
