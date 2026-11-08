/**
 * @fileoverview Event Attendee (RSVP) Data Model
 * @module DB/model/EventAttendee.model
 * @description Manages event attendance and RSVP statuses (going, interested, not_going)
 * in an independent collection with a compound unique index ensuring single registration per user.
 */

import mongoose, { Schema, Types, model } from "mongoose";

export const eventAttendeeStatus = {
    going: "going",
    interested: "interested",
    not_going: "not_going"
};

const eventAttendeeSchema = new Schema(
    {
        eventId: {
            type: Types.ObjectId,
            ref: "Event",
            required: true,
            index: true
        },
        userId: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: Object.values(eventAttendeeStatus),
            default: eventAttendeeStatus.going
        },
        checkedIn: {
            type: Boolean,
            default: false
        },
        checkedInAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index ensuring each user has strictly ONE RSVP record per event
eventAttendeeSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventAttendeeSchema.index({ eventId: 1, status: 1 });

export const eventAttendeeModel = mongoose.models.EventAttendee || model("EventAttendee", eventAttendeeSchema);

