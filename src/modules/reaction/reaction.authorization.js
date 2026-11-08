/**
 * @fileoverview Reaction Module Authorization Matrix
 * @module modules/reaction/reaction.authorization
 */

import { roleTypes } from "../../DB/model/User.model.js";

export const endpoint = {
    react: [roleTypes.user, roleTypes.admin]
};

