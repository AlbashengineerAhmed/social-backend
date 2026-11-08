/**
 * @fileoverview Admin Module Authorization Matrix
 * @module modules/admin/admin.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    dashboard: [roleTypes.admin, roleTypes.superAdmin],
    manageUsers: [roleTypes.admin, roleTypes.superAdmin],
    managePosts: [roleTypes.admin, roleTypes.superAdmin],
    manageReports: [roleTypes.admin, roleTypes.superAdmin]
};

