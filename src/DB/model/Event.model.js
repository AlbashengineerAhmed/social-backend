/**
 * @fileoverview Event Data Model
 * @module DB/model/Event.model
 * @description Defines the Mongoose schema for physical, online, and hybrid events,
 * with group association, RSVP counters, and privacy control.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const eventTypeCategories = {
    in_person: "in_person",
    online: "online",
    hybrid: "hybrid"
};

export const eventStatusTypes = {
    upcoming: "upcoming",
    ongoing: "ongoing",
    completed: "completed",
    cancelled: "cancelled"
};

export const eventPrivacyTypes = {
    public: "public",
    private: "private"
};

const eventSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        slug: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        description: {
            type: String,
            default: "",
            maxlength: 2000
        },
        category: {
            type: String,
            default: "General",
            index: true
        },
        startDate: {
            type: Date,
            required: true,
            index: true
        },
        endDate: {
            type: Date
        },
        time: {
            type: String,
            required: true
        },
        timeZone: {
            type: String,
            default: "UTC"
        },
        eventType: {
            type: String,
            enum: Object.values(eventTypeCategories),
            default: eventTypeCategories.in_person
        },
        location: {
            type: String,
            required: true
        },
        address: {
            type: String
        },
        meetingUrl: {
            type: String
        },
        privacy: {
            type: String,
            enum: Object.values(eventPrivacyTypes),
            default: eventPrivacyTypes.public,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(eventStatusTypes),
            default: eventStatusTypes.upcoming,
            index: true
        },
        creator: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        coHosts: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ],
        groupId: {
            type: Types.ObjectId,
            ref: "Group",
            index: true
        },
        cover: {
            secure_url: {
                type: String,
                default: "/assets/images/events/01.jpg"
            },
            public_id: String
        },
        maxAttendees: {
            type: Number,
            default: 0
        },
        attendeesCount: {
            going: { type: Number, default: 1, min: 0 },
            interested: { type: Number, default: 0, min: 0 },
            not_going: { type: Number, default: 0, min: 0 }
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual population of attendees from EventAttendee collection
eventSchema.virtual("attendeesList", {
    ref: "EventAttendee",
    localField: "_id",
    foreignField: "eventId"
});

// Auto-generate unique slug
eventSchema.pre("validate", function () {
    if (!this.slug && this.title) {
        const base = this.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        this.slug = `${base || "event"}-${Math.random().toString(36).substring(2, 7)}`;
    }
});

export const eventModel = mongoose.models.Event || model("Event", eventSchema);
