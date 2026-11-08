/**
 * @fileoverview HTML Email Templates
 * @module utils/email/template/verifyAccount.template
 * @description Generates styled HTML templates for OTP verification and transactional notifications.
 */

/**
 * Returns a styled HTML email template containing the user's OTP code.
 * @param {Object} options
 * @param {string|number} [options.code=""] - OTP verification code
 * @returns {string} Formatted HTML document string
 */
export const verifyAccountTemplate = ({ code = "" } = {}) => {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #1a1a1a; margin: 0; font-size: 24px; font-weight: 600; }
        .content { color: #4a5568; line-height: 1.6; font-size: 16px; margin-bottom: 30px; }
        .otp-box { background: #edf2f7; border-radius: 6px; padding: 16px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2b6cb0; margin: 20px 0; }
        .footer { text-align: center; color: #a0aec0; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Account Verification</h1>
        </div>
        <div class="content">
            <p>Welcome to our Social App!</p>
            <p>Please use the following One-Time Password (OTP) to complete your verification process. This code will expire shortly.</p>
            <div class="otp-box">${code}</div>
            <p>If you did not request this verification code, please disregard this email.</p>
        </div>
        <div class="footer">
            <p>&copy; Social App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
};
