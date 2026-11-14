
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./database.js";

import User from "./models/User.js";
import Document from "./models/Document.js";
import Reminder from "./models/Reminder.js";
import RenewalHistory from "./models/RenewalHistory.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import dashboardRoutes from "./routes/dashboard.js";
import reminderRoutes from "./routes/reminders.js";
import renewalRoutes from "./routes/renewals.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/renewals", renewalRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to DocuPulse API",
    status: "Running"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DocuPulse backend is working!"
  });
});

// Database collections test
app.get("/api/database-test", (req, res) => {
  res.json({
    success: true,
    message: "DocuPulse MongoDB collections are ready!",
    collections: [
      "users",
      "documents",
      "reminders",
      "renewalhistories"
    ]
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Initialize all four MongoDB collections
    await Promise.all([
      User.init(),
      Document.init(),
      Reminder.init(),
      RenewalHistory.init()
    ]);

    console.log("All four MongoDB models initialized!");

    app.listen(PORT, () => {
      console.log(
        `DocuPulse backend running at http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
