/**
 * @fileoverview Follow Module Authorization Matrix
 * @module modules/follow/follow.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    follow: [roleTypes.user, roleTypes.admin],
    manage: [roleTypes.user, roleTypes.admin]
};

