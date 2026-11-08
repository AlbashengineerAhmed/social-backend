/**
 * @fileoverview Story Module Authorization Matrix
 * @module modules/story/story.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    create: [roleTypes.user, roleTypes.admin],
    delete: [roleTypes.user, roleTypes.admin]
};

