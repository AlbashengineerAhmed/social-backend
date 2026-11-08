/**
 * @fileoverview MongoDB Database Connection Service
 * @module DB/connection
 * @description Establishes and manages the connection to MongoDB using Mongoose.
 */

import mongoose from "mongoose";

/**
 * Initializes connection to the MongoDB instance specified in process.env.DB_URI.
 * Logs success or error output to the console.
 * @returns {Promise<typeof mongoose>} Mongoose instance promise
 */
const connectDB = async () => {
    return await mongoose.connect(process.env.DB_URI)
        .then(() => {
            console.log(`DB connected successfully`);
        })
        .catch((err) => {
            console.log(`Fail to connect DB`, err);
        });
};

export default connectDB;
