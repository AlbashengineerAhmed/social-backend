/**
 * @fileoverview Follow Module Validation Schemas
 * @module modules/follow/follow.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

/** Validate target user id in route params */
export const targetUser = joi.object().keys({
    userId: generalFields.id.required()
}).required();

/** Validate follow request action */
export const followRequest = joi.object().keys({
    followId: generalFields.id.required(),
    action: joi.string().valid('accept', 'reject').required()
}).required();

