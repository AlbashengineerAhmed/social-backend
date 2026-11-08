/**
 * @fileoverview Generic Database Abstraction Service
 * @module DB/db.service
 * @description Centralized wrapper for Mongoose CRUD operations providing consistent signatures,
 * projection, population, and pagination support across all repository queries.
 */

/**
 * Creates a new document in the collection.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.data={}] - Document data payload
 * @returns {Promise<import('mongoose').Document>} Created Mongoose document
 */
export const create = async ({ model, data = {} } = {}) => {
    const document = await model.create(data);
    return document;
};

/**
 * Finds multiple documents matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {string} [options.select=""] - Space-separated list of fields to include/exclude
 * @param {Array<Object|string>} [options.populate=[]] - Array of populate specifications
 * @param {number} [options.skip=0] - Number of documents to skip
 * @param {number} [options.limit=1000] - Maximum number of documents to return
 * @param {Object|string} [options.sort={ createdAt: -1 }] - Sort order specification
 * @returns {Promise<Array<import('mongoose').Document>>} Array of matching documents
 */
export const find = async ({ model, filter = {}, select = "", populate = [], skip = 0, limit = 1000, sort = { createdAt: -1 } } = {}) => {
    let query = model.find(filter).select(select).populate(populate);
    if (sort) {
        query = query.sort(sort);
    }
    const document = await query.skip(skip).limit(limit);
    return document;
};

/**
 * Finds a single document matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {string} [options.select=""] - Space-separated list of fields to select
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Matching document or null
 */
export const findOne = async ({ model, filter = {}, select = "", populate = [] } = {}) => {
    const document = await model.findOne(filter).select(select).populate(populate);
    return document;
};

/**
 * Finds a document by its unique ObjectId (_id).
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {string|import('mongoose').Types.ObjectId} [options.id=""] - Document _id
 * @param {string} [options.select=""] - Field projection
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Matching document or null
 */
export const findById = async ({ model, id = "", select = "", populate = [] } = {}) => {
    const document = await model.findById(id).select(select).populate(populate);
    return document;
};

/**
 * Finds a document by _id and updates it.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {string|import('mongoose').Types.ObjectId} [options.id=""] - Document _id
 * @param {Object} [options.data={}] - Update operations or fields
 * @param {import('mongoose').QueryOptions} [options.options={}] - Query options (e.g. { new: true })
 * @param {string} [options.select=""] - Field projection
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Updated document or null
 */
export const findByIdAndUpdate = async ({ model, id = "", data = {}, options = {}, select = "", populate = [] } = {}) => {
    const document = await model.findByIdAndUpdate(id, data, options).select(select).populate(populate);
    return document;
};

/**
 * Finds the first document matching filter and updates it.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {Object} [options.data={}] - Update operations or fields
 * @param {import('mongoose').QueryOptions} [options.options={}] - Query options (e.g. { new: true })
 * @param {string} [options.select=""] - Field projection
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Updated document or null
 */
export const findOneAndUpdate = async ({ model, filter = {}, data = {}, options = {}, select = "", populate = [] } = {}) => {
    const document = await model.findOneAndUpdate(filter, data, options).select(select).populate(populate);
    return document;
};

/**
 * Updates a single document matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {Object} [options.data={}] - Update operations
 * @param {import('mongoose').QueryOptions} [options.options={}] - Query options
 * @returns {Promise<import('mongodb').UpdateResult>} Mongoose update result
 */
export const updateOne = async ({ model, filter = {}, data = {}, options = {} } = {}) => {
    const document = await model.updateOne(filter, data, options);
    return document;
};

/**
 * Updates multiple documents matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {Object} [options.data={}] - Update operations
 * @param {import('mongoose').QueryOptions} [options.options={}] - Query options
 * @returns {Promise<import('mongodb').UpdateResult>} Mongoose update result
 */
export const updateMany = async ({ model, filter = {}, data = {}, options = {} } = {}) => {
    const documents = await model.updateMany(filter, data, options);
    return documents;
};

/**
 * Finds a document by _id and deletes it.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {string|import('mongoose').Types.ObjectId} [options.id=""] - Document _id
 * @param {string} [options.select=""] - Field projection
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Deleted document or null
 */
export const findByIdAndDelete = async ({ model, id = "", select = "", populate = [] } = {}) => {
    const document = await model.findByIdAndDelete(id).select(select).populate(populate);
    return document;
};

/**
 * Finds the first document matching filter and deletes it.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @param {string} [options.select=""] - Field projection
 * @param {Array<Object|string>} [options.populate=[]] - Populate specifications
 * @returns {Promise<import('mongoose').Document|null>} Deleted document or null
 */
export const findOneAndDelete = async ({ model, filter = {}, select = "", populate = [] } = {}) => {
    const document = await model.findOneAndDelete(filter).select(select).populate(populate);
    return document;
};

/**
 * Deletes a single document matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @returns {Promise<import('mongodb').DeleteResult>} Deletion result
 */
export const deleteOne = async ({ model, filter = {} } = {}) => {
    const document = await model.deleteOne(filter);
    return document;
};

/**
 * Deletes multiple documents matching the filter criteria.
 * @param {Object} options
 * @param {import('mongoose').Model} options.model - Target Mongoose model
 * @param {Object} [options.filter={}] - MongoDB query filter
 * @returns {Promise<import('mongodb').DeleteResult>} Deletion result
 */
export const deleteMany = async ({ model, filter = {} } = {}) => {
    const documents = await model.deleteMany(filter);
    return documents;
};
