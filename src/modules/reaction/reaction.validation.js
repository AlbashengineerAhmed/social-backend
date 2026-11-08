/**
 * @fileoverview Reaction Module Validation Schemas
 * @module modules/reaction/reaction.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { reactionTypes, targetTypes } from "../../DB/model/Reaction.model.js";

/** Validate a reaction on a post */
export const reactToPost = joi.object().keys({
    postId: generalFields.id.required(),
    type: joi.string().valid(...Object.values(reactionTypes)).required()
}).required();

/** Validate a reaction on a comment */
export const reactToComment = joi.object().keys({
    postId: generalFields.id.required(),
    commentId: generalFields.id.required(),
    type: joi.string().valid(...Object.values(reactionTypes)).required()
}).required();

/** Validate removal of a reaction */
export const removeReaction = joi.object().keys({
    targetId: generalFields.id.required(),
    targetType: joi.string().valid(...Object.values(targetTypes)).required()
}).required();

/** Validate query to get reactions for a target */
export const getReactions = joi.object().keys({
    targetId: generalFields.id.required(),
    targetType: joi.string().valid(...Object.values(targetTypes)).required()
}).required();

