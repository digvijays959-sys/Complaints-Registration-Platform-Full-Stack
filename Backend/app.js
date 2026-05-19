import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

import authRoutes from "./src/routes/auth.js";
import aiRoutes from "./src/routes/ai.js";
import complaintRoutes from "./src/routes/complaints.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/complaints", complaintRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Complaint Registration Platform API is running...");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
