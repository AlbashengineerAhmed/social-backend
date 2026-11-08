/**
 * @fileoverview Events Router
 * @module modules/event/event.controller
 * @description Exposes REST endpoints for events, RSVP handling, attendee lists,
 * and friend invitations.
 */

import { Router } from "express";
import { authentication, optionalAuthentication } from "../../middleware/auth.middleware.js";
import * as eventService from "./event.service.js";

const router = Router();

// Route: Get paginated public events
router.get("/", optionalAuthentication(), eventService.getEvents);

// Route: Get events authenticated user is attending or created
router.get("/my", authentication(), eventService.getMyEvents);

// Route: Create new event
router.post("/", authentication(), eventService.createEvent);

// Route: Get event details by ID or slug
router.get("/:eventId", optionalAuthentication(), eventService.getEventById);

// Route: Update event (Creator only)
router.patch("/:eventId", authentication(), eventService.updateEvent);

// Route: Delete event (Creator only)
router.delete("/:eventId", authentication(), eventService.deleteEvent);

// Route: RSVP to event (going, interested, not_going)
router.patch("/:eventId/rsvp", authentication(), eventService.rsvpEvent);
router.patch("/:eventId/attend", authentication(), eventService.rsvpEvent);

// Route: List event attendees
router.get("/:eventId/attendees", optionalAuthentication(), eventService.getEventAttendees);

// Route: Invite friends to event
router.post("/:eventId/invite", authentication(), eventService.inviteFriendsToEvent);

export default router;
