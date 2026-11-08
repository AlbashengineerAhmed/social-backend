/**
 * @fileoverview Comment Request Validation Schemas
 * @module modules/comment/comment.validation
 * @description Provides Joi validation schemas for creating comments/replies, updating comments,
 * and freezing/unfreezing comments.
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

/**
 * @name createComment
 * @description Validates incoming parameters and body payload to create a comment or nested reply.
 */
export const createComment = joi.object().keys({
    postId: generalFields.id.required(),
    commentId: generalFields.id,
    content: joi.string().min(2).max(50000).trim(),
    file: joi.array().items(generalFields.file),
    files: joi.array().items(generalFields.file)
}).or('content', 'file', 'files').required();

/**
 * @name updateComment
 * @description Validates incoming parameters and body payload to update an existing comment.
 */
export const updateComment = joi.object().keys({
    postId: generalFields.id.required(),
    commentId: generalFields.id.required(),
    content: joi.string().min(2).max(50000).trim(),
    file: joi.array().items(generalFields.file)
}).or('content', 'file').required();

/**
 * @name freezeComment
 * @description Validates path parameters required to freeze/soft-delete a comment.
 */
export const freezeComment = joi.object().keys({
    postId: generalFields.id.required(),
    commentId: generalFields.id.required()
}).required();

/**
 * @name unfreezeComment
 * @description Validates path parameters required to restore/unfreeze a frozen comment.
 */
export const unfreezeComment = joi.object().keys({
    postId: generalFields.id.required(),
    commentId: generalFields.id.required()
}).required();
