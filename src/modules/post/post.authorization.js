/**
 * @fileoverview Post Authorization Matrix
 * @module modules/post/post.authorization
 * @description Specifies permitted roles for post manipulation endpoints.
 */

import { roleTypes } from "../../DB/model/User.model.js";

/**
 * Access control roles allowed per post management endpoint
 */
export const endpoint = {
    createPost: [roleTypes.user, roleTypes.admin],
    freezePost: [roleTypes.user, roleTypes.admin]
};
