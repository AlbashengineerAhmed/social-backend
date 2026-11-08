/**
 * @fileoverview Friendship Module Validation Schemas
 * @module modules/friendship/friendship.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

/** Validate target user ID parameter */
export const targetUser = joi.object().keys({
    userId: generalFields.id.required()
}).required();

/** Validate request ID parameter */
export const requestParam = joi.object().keys({
    requestId: generalFields.id.required()
}).required();

/** Validate friend user ID parameter */
export const friendParam = joi.object().keys({
    friendId: generalFields.id.required()
}).required();

