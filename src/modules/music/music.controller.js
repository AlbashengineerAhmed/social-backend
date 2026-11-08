import { Router } from "express";
import * as musicService from "./music.service.js";

const router = Router();

// GET /music/tracks/all
router.get("/tracks/all", musicService.getAllTracks);

// GET /music/tracks/search
router.get("/tracks/search", musicService.searchTracks);

export default router;

