
import express from "express";
import Reminder from "../models/Reminder.js";
import Document from "../models/Document.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Generate reminders for a document
router.post("/generate/:documentId", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (!document.expiryDate) {
      return res.status(400).json({
        success: false,
        message: "This document has no expiry date"
      });
    }

    if (document.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Cannot generate reminders for an archived document"
      });
    }

    const expiryDate = new Date(document.expiryDate);
    const reminderDays = [30, 7, 1];
    const createdReminders = [];
    const skippedReminders = [];

    for (const days of reminderDays) {
      const scheduledDate = new Date(expiryDate);

      scheduledDate.setDate(
        scheduledDate.getDate() - days
      );

      // Schedule reminders at 9:00 AM
      scheduledDate.setHours(9, 0, 0, 0);

      if (scheduledDate <= new Date()) {
        skippedReminders.push(days);
        continue;
      }

      const reminder = await Reminder.findOneAndUpdate(
        {
          document: document._id,
          daysBefore: days,
          scheduledDate
        },
        {
          $setOnInsert: {
            document: document._id,
            daysBefore: days,
            scheduledDate,
            isRead: false
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );

      createdReminders.push(reminder);
    }

    res.status(200).json({
      success: true,
      message: "Reminder schedule generated successfully",
      createdCount: createdReminders.length,
      skippedCount: skippedReminders.length,
      reminders: createdReminders
    });

  } catch (error) {
    console.error("Generate reminder error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to generate reminders"
    });
  }
});

// Get only reminders whose scheduled date and time have arrived
router.get("/", authMiddleware, async (req, res) => {
  try {
    const activeDocuments = await Document.find({
      user: req.userId,
      status: "Active"
    }).select("_id");

    const documentIds = activeDocuments.map(doc => doc._id);

    const reminders = await Reminder.find({
      document: { $in: documentIds },
      scheduledDate: { $lte: new Date() }
    })
      .populate("document", "name category expiryDate")
      .sort({ scheduledDate: 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      reminders
    });

  } catch (error) {
    console.error("Get reminders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reminders"
    });
  }
});

// Mark a reminder as read
router.patch("/:reminderId/read", authMiddleware, async (req, res) => {
  try {
    const reminder = await Reminder.findById(
      req.params.reminderId
    );

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    const document = await Document.findOne({
      _id: reminder.document,
      user: req.userId,
      status: "Active"
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    reminder.isRead = true;
    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Reminder marked as read",
      reminder
    });

  } catch (error) {
    console.error("Mark reminder error:", error.message);

    res.status(400).json({
      success: false,
      message: "Invalid reminder ID"
    });
  }
});

export default router;
