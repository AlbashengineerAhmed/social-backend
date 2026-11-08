/**
 * @fileoverview Nodemailer Email Dispatch Service
 * @module utils/email/send.email
 * @description Transports transactional emails (confirmations, OTPs, password resets) via Gmail SMTP.
 */

import nodemailer from "nodemailer";

/**
 * Sends an email using Nodemailer and Gmail service credentials.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text=""] - Plain text fallback content
 * @param {string} [options.html=""] - HTML email body content
 * @param {Array<Object>} [options.attachments=[]] - Attachments list
 * @returns {Promise<import('nodemailer').SentMessageInfo>} Nodemailer dispatch confirmation
 */
export const sendEmail = async ({
    to = "",
    subject = "",
    text = "",
    html = "",
    attachments = []
} = {}) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const info = await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'SocialApp'}" <${process.env.EMAIL}>`,
        to,
        subject,
        text,
        html,
        attachments
    });

    return info;
};
