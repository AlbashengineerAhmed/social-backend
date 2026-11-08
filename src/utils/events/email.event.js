/**
 * @fileoverview Asynchronous Email Events Subscriber & Dispatcher
 * @module utils/events/email.event
 * @description Event-driven background dispatching of OTP confirmation emails and updates.
 */

import { EventEmitter } from "node:events";
import { customAlphabet } from "nanoid";
import { generateHash } from "../security/hash.security.js";
import { userModel } from "../../DB/model/User.model.js";
import * as dbService from "../../DB/db.service.js";
import { sendEmail } from "../email/send.email.js";
import { verifyAccountTemplate } from "../email/template/verifyAccount.template.js";

export const emailEvent = new EventEmitter();

/**
 * Sends a generic confirmation OTP email and saves the hashed code to the specified user document field.
 * @param {Object} options
 * @param {string|import('mongoose').Types.ObjectId} options.id - User _id
 * @param {string} options.email - Target recipient email address
 * @param {string} [options.dataKey="confirmEmailOTP"] - Schema field storing the hashed OTP
 * @param {string} [options.subject="Confirm-Email"] - Email subject
 * @returns {Promise<void>}
 */
export const sendCode = async ({
    id = "",
    email = "",
    dataKey = "confirmEmailOTP",
    subject = "Confirm-Email"
} = {}) => {
    const otp = customAlphabet("0123456789", 6)();
    const hash = generateHash({ plainText: otp });
    const html = verifyAccountTemplate({ code: otp });

    const updateData = {};
    updateData[dataKey] = hash;

    await dbService.updateOne({
        model: userModel,
        filter: { _id: id },
        data: updateData
    });

    await sendEmail({ to: email, subject, html });
};

// Event listener for initial account registration confirmation
emailEvent.on("sendConfirmEmail", async ({ id, email }) => {
    await sendCode({ id, email });
});

// Event listener for password reset OTP
emailEvent.on("forgotPassword", async ({ id, email }) => {
    await sendCode({ id, email, dataKey: "resetPasswordOTP", subject: "Reset-Password" });
});

// Event listener for secondary email update OTP
emailEvent.on("sendUpdateEmail", async ({ id, email }) => {
    await sendCode({ id, email, dataKey: "tempEmailOTP", subject: "Update-Email" });
});
