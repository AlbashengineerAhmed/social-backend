/**
 * @fileoverview Events Business Logic & Service Layer
 * @module modules/event/event.service
 * @description Manages events, RSVP statuses (going, interested, not_going),
 * attendee lists, invitations, and group-linked events with atomic concurrency.
 */

import mongoose from "mongoose";
import { asyncHandler } from "../../utils/response/error.response.js";
import { successResponse } from "../../utils/response/success.response.js";
import { eventModel, eventPrivacyTypes, eventStatusTypes, eventTypeCategories } from "../../DB/model/Event.model.js";
import { eventAttendeeModel, eventAttendeeStatus } from "../../DB/model/EventAttendee.model.js";
import { groupModel } from "../../DB/model/Group.model.js";
import { paginate } from "../../utils/pagination.js";
import { createNotification } from "../notification/service/notification.service.js";
import { notificationTypes } from "../../DB/model/Notification.model.js";

/**
 * Helper to resolve event by ID or unique slug
 */
const findEventByIdOrSlug = async (identifier) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
    const filter = {
        isDeleted: false,
        ...(isObjectId ? { $or: [{ _id: identifier }, { slug: identifier }] } : { slug: identifier })
    };
    return await eventModel.findOne(filter);
};

/**
 * Retrieve paginated events with category, status, and search filters.
 * @route GET /event
 */
export const getEvents = asyncHandler(async (req, res, next) => {
    const { page, size, category, status, search, groupId } = req.query;

    const filter = { isDeleted: false };

    if (groupId) {
        filter.groupId = groupId;
    } else {
        filter.privacy = eventPrivacyTypes.public;
    }

    if (category && category !== "All") {
        filter.category = new RegExp(`^${category}$`, "i");
    }

    if (status) {
        filter.status = status;
    }

    if (search && search.trim()) {
        filter.title = { $regex: search.trim(), $options: "i" };
    }

    const data = await paginate({
        page,
        size,
        model: eventModel,
        filter,
        populate: [
            { path: "creator", select: "username image firstName lastName" },
            { path: "groupId", select: "name slug avatar cover" }
        ]
    });

    const eventsList = data.data || [];

    // If viewer is logged in, attach their RSVP status
    if (req.user?._id && eventsList.length > 0) {
        const eventIds = eventsList.map((e) => e._id);
        const userRsvps = await eventAttendeeModel.find({
            eventId: { $in: eventIds },
            userId: req.user._id
        });

        const rsvpMap = new Map(userRsvps.map((r) => [r.eventId.toString(), r.status]));

        const enriched = eventsList.map((e) => {
            const eObj = e.toObject ? e.toObject() : { ...e };
            eObj.myRsvp = rsvpMap.get(e._id.toString()) || null;
            return eObj;
        });

        data.events = enriched;
        data.data = enriched;
    } else {
        data.events = eventsList;
    }

    return successResponse({
        res,
        status: 200,
        message: "Events retrieved successfully",
        data
    });
});

/**
 * Retrieve events created by or attended by the authenticated user.
 * @route GET /event/my
 */
export const getMyEvents = asyncHandler(async (req, res, next) => {
    const attendees = await eventAttendeeModel.find({
        userId: req.user._id,
        status: { $in: [eventAttendeeStatus.going, eventAttendeeStatus.interested] }
    }).populate({
        path: "eventId",
        match: { isDeleted: false },
        populate: { path: "creator", select: "username image" }
    });

    const events = attendees
        .map((a) => {
            if (!a.eventId) return null;
            const e = a.eventId.toObject ? a.eventId.toObject() : { ...a.eventId };
            e.myRsvp = a.status;
            return e;
        })
        .filter(Boolean);

    return successResponse({
        res,
        status: 200,
        data: { events }
    });
});

/**
 * Retrieve single event details by ID or slug.
 * @route GET /event/:eventId
 */
export const getEventById = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const event = await findEventByIdOrSlug(eventId);

    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    const eventObj = event.toObject ? event.toObject() : { ...event };

    if (req.user?._id) {
        const attendee = await eventAttendeeModel.findOne({
            eventId: event._id,
            userId: req.user._id
        });
        eventObj.myRsvp = attendee?.status || null;
    }

    return successResponse({
        res,
        status: 200,
        data: { event: eventObj }
    });
});

/**
 * Create a new event with creator registered as 'going'.
 * @route POST /event
 */
export const createEvent = asyncHandler(async (req, res, next) => {
    const {
        title,
        description,
        category,
        startDate,
        endDate,
        time,
        timeZone,
        eventType,
        location,
        address,
        meetingUrl,
        privacy,
        groupId,
        maxAttendees,
        cover
    } = req.body;

    if (!title || !title.trim()) {
        return next(new Error("Event title is required", { cause: 400 }));
    }

    const event = await eventModel.create({
        title: title.trim(),
        description: description || "",
        category: category || "General",
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        time: time || "10:00 AM",
        timeZone: timeZone || "UTC",
        eventType: eventType || eventTypeCategories.in_person,
        location: location || "TBD",
        address: address || "",
        meetingUrl: meetingUrl || "",
        privacy: privacy || eventPrivacyTypes.public,
        groupId: groupId || undefined,
        maxAttendees: maxAttendees || 0,
        cover: cover ? { secure_url: cover } : undefined,
        creator: req.user._id,
        attendeesCount: { going: 1, interested: 0, not_going: 0 }
    });

    // Create creator RSVP record as 'going'
    await eventAttendeeModel.create({
        eventId: event._id,
        userId: req.user._id,
        status: eventAttendeeStatus.going
    });

    const populated = await eventModel.findById(event._id).populate("creator", "username image");

    return successResponse({
        res,
        status: 201,
        message: "Event created successfully",
        data: { event: populated }
    });
});

/**
 * Update event details (Creator only).
 * @route PATCH /event/:eventId
 */
export const updateEvent = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const event = await findEventByIdOrSlug(eventId);

    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    if (event.creator.toString() !== req.user._id.toString()) {
        return next(new Error("Only the event creator can edit event details", { cause: 403 }));
    }

    const allowedUpdates = [
        "title",
        "description",
        "category",
        "startDate",
        "endDate",
        "time",
        "timeZone",
        "eventType",
        "location",
        "address",
        "meetingUrl",
        "privacy",
        "maxAttendees",
        "status"
    ];

    for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
            event[key] = req.body[key];
        }
    }

    if (req.body.cover) {
        event.cover = { secure_url: req.body.cover };
    }

    await event.save();

    return successResponse({
        res,
        status: 200,
        message: "Event updated successfully",
        data: { event }
    });
});

/**
 * Soft delete event (Creator only).
 * @route DELETE /event/:eventId
 */
export const deleteEvent = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const event = await findEventByIdOrSlug(eventId);

    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    const isCreator = event.creator?.toString() === req.user._id.toString();
    const isPlatformAdmin = req.user.role === "admin";

    if (!isCreator && !isPlatformAdmin) {
        return next(new Error("Only the event creator or platform admin can delete this event", { cause: 403 }));
    }

    event.isDeleted = true;
    await event.save();

    return successResponse({
        res,
        status: 200,
        message: "Event deleted successfully"
    });
});

/**
 * RSVP to an event ('going', 'interested', 'not_going').
 * Atomically synchronizes attendeesCount on event document.
 * Backward compatible with legacy toggleAttendEvent.
 * @route PATCH /event/:eventId/rsvp | PATCH /event/:eventId/attend
 */
export const rsvpEvent = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const requestedStatus = req.body?.status || req.query?.status || "going";

    if (!Object.values(eventAttendeeStatus).includes(requestedStatus)) {
        return next(new Error("Invalid RSVP status", { cause: 400 }));
    }

    const event = await findEventByIdOrSlug(eventId);
    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    const existingRsvp = await eventAttendeeModel.findOne({
        eventId: event._id,
        userId: req.user._id
    });

    const oldStatus = existingRsvp?.status || null;

    // If identical status, toggle off (switch to not_going)
    const finalStatus = oldStatus === requestedStatus ? eventAttendeeStatus.not_going : requestedStatus;

    // Atomically compute counter increments
    const incObj = {};

    if (oldStatus && oldStatus !== finalStatus) {
        incObj[`attendeesCount.${oldStatus}`] = -1;
    }
    if (finalStatus !== eventAttendeeStatus.not_going && (!oldStatus || oldStatus !== finalStatus)) {
        incObj[`attendeesCount.${finalStatus}`] = 1;
    }

    // Save attendee record
    await eventAttendeeModel.findOneAndUpdate(
        { eventId: event._id, userId: req.user._id },
        {
            eventId: event._id,
            userId: req.user._id,
            status: finalStatus
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Apply atomic counter adjustments
    if (Object.keys(incObj).length > 0) {
        await eventModel.updateOne({ _id: event._id }, { $inc: incObj });
    }

    const updatedEvent = await eventModel.findById(event._id);

    return successResponse({
        res,
        status: 200,
        message: `RSVP updated to ${finalStatus}`,
        data: {
            myRsvp: finalStatus,
            attendeesCount: updatedEvent.attendeesCount
        }
    });
});

export const toggleAttendEvent = rsvpEvent;

/**
 * Retrieve attendees for an event filtered by RSVP status.
 * @route GET /event/:eventId/attendees
 */
export const getEventAttendees = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const { page, size, status } = req.query;

    const event = await findEventByIdOrSlug(eventId);
    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    const filter = { eventId: event._id };
    if (status && Object.values(eventAttendeeStatus).includes(status)) {
        filter.status = status;
    } else {
        filter.status = { $in: [eventAttendeeStatus.going, eventAttendeeStatus.interested] };
    }

    const data = await paginate({
        page,
        size,
        model: eventAttendeeModel,
        filter,
        populate: [{ path: "userId", select: "username image firstName lastName" }]
    });

    data.attendees = data.data || [];
    data.posts = data.data || [];

    return successResponse({
        res,
        status: 200,
        data
    });
});

/**
 * Invite friends to an event.
 * @route POST /event/:eventId/invite
 */
export const inviteFriendsToEvent = asyncHandler(async (req, res, next) => {
    const { eventId } = req.params;
    const { friendIds } = req.body;

    if (!Array.isArray(friendIds) || friendIds.length === 0) {
        return next(new Error("Please provide friend IDs to invite", { cause: 400 }));
    }

    const event = await findEventByIdOrSlug(eventId);
    if (!event) {
        return next(new Error("Event not found", { cause: 404 }));
    }

    for (const friendId of friendIds) {
        try {
            await createNotification({
                recipient: friendId,
                actor: req.user._id,
                type: notificationTypes.event_invite,
                entityId: event._id,
                entityType: "Event",
                message: `${req.user.username || 'A friend'} invited you to attend ${event.title}.`
            });
        } catch (err) {
            console.error("Failed to notify invited friend:", err);
        }
    }

    return successResponse({
        res,
        status: 200,
        message: `Invitations sent to ${friendIds.length} friends`
    });
});
