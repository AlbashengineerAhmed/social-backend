import { asyncHandler } from "../../utils/response/error.response.js";
import { successResponse } from "../../utils/response/success.response.js";

const FREETOUSE_BASE = "https://api.freetouse.com/v3";

const FALLBACK_TRACKS = [
    {
        id: "ftu-ambient-1",
        title: "Starchild (Celestial Ambience)",
        artist: "Zambolino",
        audioUrl: "https://eu.data.freetouse.com/music/tracks/5c008648-f840-4e69-b62b-51d006b216e1/file/mp3/file.mp3",
        cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80",
        duration: 135,
        genre: "Soundtrack",
    },
    {
        id: "ftu-lofi-1",
        title: "Sunset Chill & Coffee",
        artist: "Lofi Dreamer",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
        cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80",
        duration: 140,
        genre: "Lofi",
    },
    {
        id: "ftu-upbeat-1",
        title: "Happy Summer Vibes",
        artist: "Sound Gallery by FreeToUse",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=summer-walk-111100.mp3",
        cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80",
        duration: 120,
        genre: "Acoustic / Upbeat",
    },
    {
        id: "ftu-deep-1",
        title: "Midnight Focus Beat",
        artist: "Night Owl Lab",
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77b78.mp3?filename=chill-abstract-intention-12099.mp3",
        cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
        duration: 155,
        genre: "Electronic",
    },
];

const parseArtist = (artists) => {
    if (!artists) return "FreeToUse Artist";
    if (Array.isArray(artists)) {
        const first = artists[0];
        if (Array.isArray(first) && first[1]?.name) {
            return first[1].name;
        }
        if (first?.name) {
            return first.name;
        }
        if (typeof first === "string") return first;
    }
    return "FreeToUse Artist";
};

const parseTrack = (raw) => {
    const id = raw.id || `track_${Date.now()}`;
    const title = raw.title || "Untitled Track";
    const artist = parseArtist(raw.artists);
    const audioUrl =
        raw.files?.mp3 ||
        raw.file ||
        raw.audio_url ||
        raw.preview_url ||
        "https://eu.data.freetouse.com/music/tracks/5c008648-f840-4e69-b62b-51d006b216e1/file/mp3/file.mp3";
    const cover =
        raw.thumbnails?.md ||
        raw.thumbnails?.sm ||
        raw.thumbnails?.lg ||
        raw.cover ||
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80";
    const duration = Math.round(raw.duration || 120);
    const genre = raw.genre || "Soundtrack";

    return { id, title, artist, audioUrl, cover, duration, genre };
};

/**
 * Proxy: Get all tracks from FreeToUse API (server-side, zero CORS issues)
 * @route GET /music/tracks/all
 */
export const getAllTracks = asyncHandler(async (req, res, next) => {
    const limit = req.query.limit || 20;
    const page = req.query.page || 1;

    try {
        const response = await fetch(`${FREETOUSE_BASE}/music/tracks/all?limit=${limit}&page=${page}`, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`FreeToUse HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
            const tracks = json.data.map(parseTrack);
            return successResponse({ res, data: { tracks } });
        }

        return successResponse({ res, data: { tracks: FALLBACK_TRACKS } });
    } catch (err) {
        console.warn("FreeToUse proxy error, using curated fallback tracks:", err.message);
        return successResponse({ res, data: { tracks: FALLBACK_TRACKS } });
    }
});

/**
 * Proxy: Search tracks from FreeToUse API
 * @route GET /music/tracks/search
 */
export const searchTracks = asyncHandler(async (req, res, next) => {
    const query = req.query.q || "";
    const limit = req.query.limit || 20;

    if (!query.trim()) {
        return getAllTracks(req, res, next);
    }

    try {
        const response = await fetch(`${FREETOUSE_BASE}/music/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`FreeToUse HTTP ${response.status}`);
        }

        const json = await response.json();
        if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
            const tracks = json.data.map(parseTrack);
            return successResponse({ res, data: { tracks } });
        }

        const q = query.toLowerCase();
        const filtered = FALLBACK_TRACKS.filter(
            (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genre?.toLowerCase().includes(q)
        );

        return successResponse({ res, data: { tracks: filtered.length > 0 ? filtered : FALLBACK_TRACKS } });
    } catch (err) {
        console.warn("FreeToUse search proxy error:", err.message);
        const q = query.toLowerCase();
        const filtered = FALLBACK_TRACKS.filter(
            (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.genre?.toLowerCase().includes(q)
        );
        return successResponse({ res, data: { tracks: filtered.length > 0 ? filtered : FALLBACK_TRACKS } });
    }
});

