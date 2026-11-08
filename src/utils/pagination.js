/**
 * @fileoverview Generic Mongoose Query Pagination Utility
 * @module utils/pagination
 * @description Computes pagination metadata (skip, limit, total document count, current page)
 * and executes query using dbService.
 */

import * as dbService from '../DB/db.service.js';

/**
 * Paginates results for any Mongoose model.
 * @param {Object} options
 * @param {number|string} [options.page] - Page number (defaults to process.env.PAGE or 1)
 * @param {number|string} [options.size] - Page size limit (defaults to process.env.SIZE or 2)
 * @param {import('mongoose').Model} options.model - Mongoose model to query
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @param {Object} [options.filter={}] - Query filter
 * @param {string} [options.select=""] - Field projection string
 * @returns {Promise<{ data: Array<Object>, page: number, size: number, count: number }>} Paginator result object
 */
export const paginate = async ({
    page,
    size,
    limit,
    model,
    populate = [],
    filter = {},
    select = "",
    sort = { createdAt: -1 }
} = {}) => {
    const rawPage = page;
    const rawSize = size || limit;
    page = parseInt(rawPage < 1 || !rawPage ? (process.env.PAGE || 1) : rawPage);
    size = parseInt(rawSize < 1 || !rawSize ? (process.env.SIZE || 10) : rawSize);
    const skip = (page - 1) * size;

    const count = await model.find(filter).countDocuments();
    const data = await dbService.find({
        model,
        filter,
        populate,
        select,
        sort,
        skip,
        limit: size
    });

    return { data, posts: data, page, size, count };
};
