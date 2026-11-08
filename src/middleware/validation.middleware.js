/**
 * @fileoverview Request Validation Middleware & Reusable Joi Schemas
 * @module middleware/validation.middleware
 * @description Validates combined request data (query, body, params, files) against Joi schemas.
 */

import joi from 'joi';
import { Types } from 'mongoose';

/**
 * Custom Joi validator to verify whether a string is a valid MongoDB ObjectId.
 * @param {string} value - String representation of ObjectId
 * @param {import('joi').CustomHelpers} helper - Joi error helper
 * @returns {boolean|*} Returns true if valid or helper message on failure
 */
export const isValidObjectId = (value, helper) => {
    return Types.ObjectId.isValid(value) ? true : helper.message("In-valid objectId");
};

/**
 * Reusable Joi validation schemas for common request payload fields.
 */
export const generalFields = {
    username: joi.string().min(2).max(50).trim().messages({
        'string.min': 'Username must be at least 2 characters long',
        'string.max': 'Username cannot exceed 50 characters',
        'any.required': 'Username is required'
    }),
    email: joi.string().email({ minDomainSegments: 2, maxDomainSegments: 3, tlds: { allow: ['com', 'net'] } }).messages({
        'string.email': 'Please provide a valid email address (e.g. user@example.com)',
        'any.required': 'Email is required'
    }),
    password: joi.string().pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/)).messages({
        'string.pattern.base': 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
        'string.empty': 'Password cannot be empty',
        'any.required': 'Password is required'
    }),
    confirmationPassword: joi.string().messages({
        'any.only': 'Confirmation password must match password',
        'any.required': 'Confirmation password is required'
    }),
    code: joi.string().pattern(new RegExp(/^\d{4,6}$/)).messages({
        'string.pattern.base': 'Verification code must be 4 to 6 digits',
        'any.required': 'Verification code is required'
    }),
    id: joi.string().custom(isValidObjectId),
    file: joi.object().keys({
        size: joi.number().positive().required(),
        path: joi.string().required(),
        filename: joi.string().required(),
        destination: joi.string().required(),
        mimetype: joi.string().required(),
        encoding: joi.string().required(),
        originalname: joi.string().required(),
        fieldname: joi.string().required()
    }).unknown(true)
};

/**
 * Higher-order middleware function to validate combined request inputs against a given Joi schema.
 * Collects errors and returns a 400 Bad Request response with validation details if invalid.
 * @param {import('joi').Schema} schema - Joi validation schema
 * @returns {import('express').RequestHandler} Express middleware
 */
export const validation = (schema) => {
    return (req, res, next) => {
        const inputs = { ...req.query, ...req.body, ...req.params };
        if (req.file) {
            inputs.file = req.file;
        }
        if (req.files && req.files.length > 0) {
            inputs.file = req.files;
            inputs.files = req.files;
        }

        const validationResult = schema.validate(inputs, { abortEarly: false });
        if (validationResult.error) {
            const formattedDetails = validationResult.error.details.map(err => {
                let msg = err.message ? err.message.replace(/['"]/g, '') : "Validation error";
                // Prevent leaking plain-text passwords or displaying raw regex
                if (err.context?.key?.toLowerCase().includes('password') || msg.toLowerCase().includes('password with value')) {
                    msg = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number';
                } else if (msg.includes('fails to match the required pattern') || msg.includes('(?=')) {
                    msg = `${err.context?.key || 'Field'} has an invalid format`;
                }
                return {
                    message: msg,
                    path: err.path,
                    type: err.type
                };
            });
            return res.status(400).json({
                message: formattedDetails[0]?.message || "Validation error",
                details: formattedDetails
            });
        }
        return next();
    };
};
