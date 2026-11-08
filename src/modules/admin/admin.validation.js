/**
 * @fileoverview Admin Module Validation Schemas
 * @module modules/admin/admin.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { reportStatusTypes } from "../../DB/model/Report.model.js";
import { roleTypes } from "../../DB/model/User.model.js";

/** Validate target user id */
export const userId = joi.object().keys({
    userId: generalFields.id.required()
}).required();

/** Validate update user role */
export const updateUserRole = joi.object().keys({
    userId: generalFields.id.required(),
    role: joi.string().valid(...Object.values(roleTypes)).required()
}).required();

/** Validate target group id */
export const groupId = joi.object().keys({
    groupId: generalFields.id.required()
}).required();

/** Validate target post id */
export const postId = joi.object().keys({
    postId: generalFields.id.required()
}).required();

/** Validate comment id */
export const commentId = joi.object().keys({
    commentId: generalFields.id.required()
}).required();

/** Validate report id */
export const reportId = joi.object().keys({
    reportId: generalFields.id.required()
}).required();

/** Validate report review */
export const reviewReport = joi.object().keys({
    reportId: generalFields.id.required(),
    status: joi.string().valid(
        reportStatusTypes.reviewed,
        reportStatusTypes.resolved,
        reportStatusTypes.rejected
    ).required(),
    reviewNote: joi.string().max(500)
}).required();

