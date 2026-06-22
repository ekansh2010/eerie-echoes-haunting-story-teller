import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { initDb } from "./src/database/mongoDb";
import authRoutes from "./src/routes/auth.routes";
import storyRoutes from "./src/routes/stories.routes";
import adminRoutes from "./src/routes/admin.routes";

dotenv.config();

// Initialize Database & Seeding
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/eerie_echoes";
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB!");
    await initDb();
  })
  .catch(err => console.error("MongoDB connection error:", err));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/admin", adminRoutes);

// Serve static files from the React app in production
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "alive in the void", time: new Date().toISOString() });
});

// Serve frontend for all other requests
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Eerie Echoes Server] whispering on port ${PORT}...`);
  });
}

export default app;
