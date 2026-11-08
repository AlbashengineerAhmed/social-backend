/**
 * @fileoverview Story Module Validation Schemas
 * @module modules/story/story.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";
import { storyVisibilityTypes } from "../../DB/model/Story.model.js";

/** Validate story creation */
export const createStory = joi.object().keys({
    content: joi.string().min(1).max(500).trim(),
    backgroundColor: joi.string().max(200),
    textColor: joi.string().max(50),
    visibility: joi.string().valid(...Object.values(storyVisibilityTypes)),
    file: generalFields.file,
    music: joi.alternatives().try(joi.string(), joi.object()),
    stickers: joi.alternatives().try(joi.string(), joi.array()),
    location: joi.alternatives().try(joi.string(), joi.object())
}).unknown(true);

/** Validate story id param */
export const storyId = joi.object().keys({
    storyId: generalFields.id.required()
}).required();

/** Validate story reaction */
export const reactToStory = joi.object().keys({
    storyId: generalFields.id.required(),
    emoji: joi.string().trim().required()
}).required();

/** Validate story reply */
export const replyToStory = joi.object().keys({
    storyId: generalFields.id.required(),
    text: joi.string().trim().min(1).max(1000).required()
}).required();

