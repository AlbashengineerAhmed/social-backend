import { Router } from "express";
import { authentication } from "../../middleware/auth.middleware.js";
import * as chatService from "./chat.service.js";

const router = Router();

router.get("/conversations", authentication(), chatService.getConversations);
router.get("/:conversationId/messages", authentication(), chatService.getMessages);
router.post("/message", authentication(), chatService.sendMessage);

export default router;

