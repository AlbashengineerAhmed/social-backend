/**
 * @fileoverview Story Data Model
 * @module DB/model/Story.model
 * @description Defines the Mongoose schema for user stories with a 24-hour TTL expiration.
 */

import mongoose, { Schema, Types, model } from "mongoose";

/**
 * Story media types
 * @readonly
 * @enum {string}
 */
export const storyMediaTypes = {
    image: "image",
    video: "video",
    text: "text"
};

/**
 * Story visibility types
 * @readonly
 * @enum {string}
 */
export const storyVisibilityTypes = {
    public: "public",
    followers: "followers",
    close_friends: "close_friends"
};

/**
 * Story Schema definition
 */
const storySchema = new Schema({
    createdBy: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    media: {
        secure_url: String,
        public_id: String,
        type: {
            type: String,
            enum: Object.values(storyMediaTypes)
        }
    },
    backgroundColor: {
        type: String,
        default: "#000000"
    },
    textColor: {
        type: String,
        default: "#FFFFFF"
    },
    music: {
        title: String,
        artist: { type: String, default: "Music" },
        audioUrl: String,
        cover: String,
        startTime: { type: Number, default: 0 },
        duration: { type: Number, default: 40 }, // 40 seconds
        x: { type: Number, default: 50 },
        y: { type: Number, default: 20 }
    },
    stickers: [
        {
            type: { type: String },
            text: String,
            x: { type: Number, default: 50 },
            y: { type: Number, default: 50 }
        }
    ],
    textPosition: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 50 }
    },
    location: {
        name: String,
        address: String,
        lat: Number,
        lng: Number
    },
    visibility: {
        type: String,
        enum: Object.values(storyVisibilityTypes),
        default: storyVisibilityTypes.followers
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        index: { expireAfterSeconds: 0 } // TTL index
    },
    reactions: [
        {
            userId: { type: Types.ObjectId, ref: 'User' },
            emoji: { type: String, default: '❤️' },
            createdAt: { type: Date, default: Date.now }
        }
    ]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate for story views
storySchema.virtual('views', {
    localField: '_id',
    foreignField: 'storyId',
    ref: 'StoryView'
});

export const storyModel = mongoose.models.Story || model("Story", storySchema);

