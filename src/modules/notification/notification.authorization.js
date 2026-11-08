/**
 * @fileoverview Notification Module Authorization Matrix
 * @module modules/notification/notification.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    manage: [roleTypes.user, roleTypes.admin]
};

