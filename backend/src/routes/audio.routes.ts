import { Router } from "express";
import { AudioTrack } from "../models/index.js";
import { stripInternal } from "../services/serializers.js";

const router = Router();

// GET /api/audio-tracks
router.get("/", async (_req, res) => {
  const tracks = await AudioTrack.find().sort({ id: 1 }).lean();
  res.set("Cache-Control", "public, max-age=300");
  res.json(tracks.map(stripInternal));
});

export default router;
