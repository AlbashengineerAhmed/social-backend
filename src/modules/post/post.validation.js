/**
 * @fileoverview Post Request Validation Schemas
 * @module modules/post/post.validation
 * @description Defines strict Joi validation rules for post creation, modification, soft-deletion, restoration, and reaction toggle operations.
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { postPrivacyTypes } from "../../DB/model/Post.model.js";

/**
 * @name createPost
 * @description Validates the payload required to publish a new post.
 * Supports text, media attachments, and optional privacy/groupId controls.
 */
export const createPost = joi.object().keys({
    content: joi.string().min(1).max(50000).trim().optional().allow(''),
    privacy: joi.string().valid(...Object.values(postPrivacyTypes)).optional(),
    groupId: generalFields.id.optional(),
    file: joi.alternatives().try(generalFields.file, joi.array().items(generalFields.file)).optional(),
    files: joi.array().items(generalFields.file).optional(),
    attachments: joi.array().items(generalFields.file).optional()
}).unknown(true).required();

/**
 * @name updatePost
 * @description Validates incoming parameters and body payload for updating an existing post.
 */
export const updatePost = joi.object().keys({
    postId: generalFields.id.required(),
    content: joi.string().min(2).max(50000).trim(),
    file: joi.array().items(generalFields.file),
    files: joi.array().items(generalFields.file)
}).or('content', 'file', 'files').required();

/**
 * @name freezePost
 * @description Validates the route parameter for soft-deleting/freezing a post.
 */
export const freezePost = joi.object().keys({
    postId: generalFields.id.required()
}).required();

/**
 * @name unfreezePost
 * @description Validates the route parameter for restoring an unfreezing a soft-deleted post.
 */
export const unfreezePost = joi.object().keys({
    postId: generalFields.id.required()
}).required();

/**
 * @name likePost
 * @description Validates the route parameter and action query param for liking/unliking a post.
 */
export const likePost = joi.object().keys({
    postId: generalFields.id.required(),
    action: joi.string().valid('unLike', 'like').insensitive()
}).required();
