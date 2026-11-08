/**
 * @fileoverview User Data Model
 * @module DB/model/User.model
 * @description Defines the Mongoose schema for user accounts, including authentication providers,
 * credentials, role authorization levels, virtual fields (username getter/setter), and password hashing pre-hooks.
 */

import mongoose, { Schema, Types, model } from "mongoose";
import { generateHash } from "../../utils/security/hash.security.js";

/**
 * Authentication provider types
 * @readonly
 * @enum {string}
 */
export const providerTypes = {
    google: "google",
    system: "system"
};

/**
 * User gender categories
 * @readonly
 * @enum {string}
 */
export const genderTypes = {
    male: "male",
    female: "female"
};

/**
 * Authorization role types
 * @readonly
 * @enum {string}
 */
export const roleTypes = {
    user: "user",
    admin: "admin",
    superAdmin: "superAdmin"
};

/**
 * User Schema definition
 */
const userSchema = new Schema({
    firstName: {
        type: String,
        minlength: 2,
        maxlength: 50,
        trim: true
    },
    lastName: {
        type: String,
        minlength: 2,
        maxlength: 50,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    confirmEmailOTP: String,
    tempEmail: String,
    tempEmailOTP: String,
    password: {
        type: String,
        required: function () {
            return this.provider === providerTypes.system;
        }
    },
    resetPasswordOTP: String,
    phone: String,
    address: String,
    DOB: Date,
    image: {
        secure_url: String,
        public_id: String
    },
    coverImages: [{
        secure_url: String,
        public_id: String
    }],
    gender: {
        type: String,
        enum: Object.values(genderTypes),
        default: genderTypes.male
    },
    role: {
        type: String,
        enum: Object.values(roleTypes),
        default: roleTypes.user
    },
    provider: {
        type: String,
        enum: Object.values(providerTypes),
        default: providerTypes.system
    },
    confirmEmail: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    changeCredentialsTime: Date,
    viewers: [{
        userId: { type: Types.ObjectId, ref: 'User' },
        time: Date
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Virtual 'username' getter and setter
 * Splits full name string into firstName and lastName on assign; joins them on read.
 */
userSchema.virtual('username').set(function (value) {
    if (value) {
        const clean = String(value).replace(/^["']|["']$/g, '').trim();
        const parts = clean.split(/\s+/);
        this.firstName = parts[0] || "User";
        this.lastName = parts.slice(1).join(" ") || parts[0] || "User";
    }
}).get(function () {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

/**
 * Pre-save Mongoose document hook
 * Automatically hashes password when modified before saving to database.
 */
userSchema.pre('save', function (next) {
    if (this.isModified('password')) {
        this.password = generateHash({ plainText: this.password });
    }
    next();
});

export const userModel = mongoose.models.User || model("User", userSchema);
