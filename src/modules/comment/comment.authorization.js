/**
 * @fileoverview Comment Authorization Endpoints and Role Matrix
 * @module modules/comment/comment.authorization
 * @description Specifies role-based access control permissions for comment operations.
 */

import { roleTypes } from "../../DB/model/User.model.js";

/**
 * Access control list specifying allowed roles per comment action.
 * @constant
 * @type {Record<string, string[]>}
 */
export const endpoint = {
    comment: [roleTypes.user, roleTypes.admin],
    create: [roleTypes.user],
    update: [roleTypes.user],
    freeze: [roleTypes.user, roleTypes.admin],
    createComment: [roleTypes.user, roleTypes.admin],
    updateComment: [roleTypes.user, roleTypes.admin],
    freezeComment: [roleTypes.user, roleTypes.admin]
};
