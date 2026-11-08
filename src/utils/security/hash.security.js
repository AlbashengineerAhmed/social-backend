/**
 * @fileoverview Password & Text Hashing Security Helpers
 * @module utils/security/hash.security
 * @description Provides synchronous cryptographic hashing and verification using Bcrypt.
 */

import bcrypt from "bcrypt";

/**
 * Generates a bcrypt hash from plain text using configured salt rounds.
 * @param {Object} options
 * @param {string} [options.plainText=""] - Plain text string to hash
 * @param {number} [options.salt=parseInt(process.env.SALT)] - Salt rounds
 * @returns {string} Hashed string
 */
export const generateHash = ({ plainText = "", salt = parseInt(process.env.SALT) } = {}) => {
    const hash = bcrypt.hashSync(plainText, salt);
    return hash;
};

/**
 * Compares a plain text string against a hashed value.
 * @param {Object} options
 * @param {string} [options.plainText=""] - Plain text input
 * @param {string} [options.hashValue=""] - Previously generated bcrypt hash
 * @returns {boolean} True if plain text matches hash, false otherwise
 */
export const compareHash = ({ plainText = "", hashValue = "" } = {}) => {
    const match = bcrypt.compareSync(plainText, hashValue);
    return match;
};
