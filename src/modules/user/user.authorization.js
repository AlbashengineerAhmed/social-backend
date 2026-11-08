/**
 * @fileoverview User Authorization Endpoints & Permissions Matrix
 * @module modules/user/user.authorization
 * @description Specifies permitted roles for admin-restricted user operations.
 */

import { roleTypes } from "../../DB/model/User.model.js";

/**
 * Access control roles allowed per user management endpoint
 */
export const endpoint = {
    dashboard: [roleTypes.admin, roleTypes.superAdmin],
    changeRoles: [roleTypes.admin, roleTypes.superAdmin]
};
