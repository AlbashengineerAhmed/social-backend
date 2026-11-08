/**
 * @fileoverview Centralized Error Handling Utilities
 * @module utils/response/error.response
 * @description Provides an async wrapper to catch unhandled promise rejections
 * and a global error handling middleware for formatting error responses.
 */

/**
 * Async handler wrapper to catch rejected promises in route handlers
 * and pass them to Express's next(error) pipeline with status cause fallback.
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {import('express').RequestHandler} Wrapped Express middleware
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        return fn(req, res, next).catch((error) => {
            error.cause = error.cause || 500;
            return next(error);
        });
    };
};

/**
 * Global error-handling middleware
 * Formats errors with message, details, and stack trace in DEV mood; outputs sanitized errors in PROD.
 * @param {Error & { cause?: number }} error - Error object with optional HTTP cause code
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 * @returns {import('express').Response} JSON error response
 */
export const globalErrorHandling = (error, req, res, next) => {
    if (process.env.MOOD === "DEV") {
        return res.status(error.cause || 400).json({
            message: error.message,
            error,
            stack: error.stack
        });
    }
    return res.status(error.cause || 400).json({
        message: error.message
    });
};
