/**
 * @fileoverview Standardized Success Response Utility
 * @module utils/response/success.response
 * @description Standardizes the shape of successful JSON responses across all application endpoints.
 */

/**
 * Sends a standardized JSON success response.
 * @param {Object} options
 * @param {import('express').Response} options.res - Express response object
 * @param {string} [options.message="Done"] - Human-readable success message
 * @param {Object} [options.data={}] - Response payload properties (spread into top-level response)
 * @param {number} [options.status=200] - HTTP status code
 * @returns {import('express').Response} Express JSON response
 */
export const successResponse = ({ res, message = "Done", data = {}, status = 200 } = {}) => {
    return res.status(status).json({ message, ...data });
};
