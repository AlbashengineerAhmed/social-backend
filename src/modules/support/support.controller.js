/**
 * @fileoverview Support Ticket Router
 * @module modules/support/support.controller
 * @description Endpoints for Support Inbox, content reports, ban appeals, and admin decision processing.
 */

import { Router } from "express";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import * as supportService from "./service/support.service.js";
import { roleTypes } from "../../DB/model/User.model.js";

const router = Router();

// ========================
// Public Route (Ban Appeal)
// ========================
router.post("/appeal", supportService.submitAppeal);

// ========================
// Authenticated User Routes (Support Inbox)
// ========================
router.post("/tickets", authentication(), supportService.createTicket);
router.get("/my-tickets", authentication(), supportService.getMyTickets);
router.get("/tickets/:ticketId", authentication(), supportService.getTicketDetails);
router.post("/tickets/:ticketId/reply", authentication(), supportService.userReplyTicket);

// ========================
// Admin Control Routes
// ========================
const adminRoles = [roleTypes.admin, roleTypes.superAdmin];

router.get(
    "/admin/tickets",
    authentication(),
    authorization(adminRoles),
    supportService.adminListTickets
);

router.patch(
    "/admin/tickets/:ticketId/decision",
    authentication(),
    authorization(adminRoles),
    supportService.adminResolveTicket
);

export default router;

