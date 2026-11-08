/**
 * @fileoverview Friendship Module Authorization Matrix
 * @module modules/friendship/friendship.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    manage: [roleTypes.user, roleTypes.admin]
};

