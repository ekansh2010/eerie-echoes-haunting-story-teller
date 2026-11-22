// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// Static frontend files are served by Vercel's CDN, so the app runs without staticDir.
import { createApp } from "../backend/src/app.js";

const app = createApp({ staticDir: null, autoConnect: true });

export default app;
