/**
 * @fileoverview Notification Module Validation Schemas
 * @module modules/notification/notification.validation
 */

import joi from "joi";
import { generalFields } from "../../middleware/validation.middleware.js";

/** Validate notification id */
export const notificationId = joi.object().keys({
    notificationId: generalFields.id.required()
}).required();

