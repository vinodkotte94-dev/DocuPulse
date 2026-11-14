
import express from "express";
import RenewalHistory from "../models/RenewalHistory.js";
import Document from "../models/Document.js";
import Reminder from "../models/Reminder.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Automatically create reminders for a document's expiry date
const syncDocumentReminders = async (document) => {
  // Delete reminders associated with the old expiry date
  await Reminder.deleteMany({
    document: document._id
  });

  // Do not create reminders for archived documents
  if (document.status !== "Active" || !document.expiryDate) {
    return;
  }

  const daysBeforeList = [30, 7, 1];
  const remindersToCreate = [];

  for (const daysBefore of daysBeforeList) {
    const scheduledDate = new Date(document.expiryDate);

    scheduledDate.setDate(
      scheduledDate.getDate() - daysBefore
    );

    // Set reminder time to 9:00 AM
    scheduledDate.setHours(9, 0, 0, 0);

    // Skip reminders whose scheduled date has already passed
    if (scheduledDate <= new Date()) {
      continue;
    }

    remindersToCreate.push({
      document: document._id,
      daysBefore,
      scheduledDate,
      isRead: false
    });
  }

  if (remindersToCreate.length > 0) {
    await Reminder.insertMany(remindersToCreate);
  }
};

// Renew a document
router.post("/:documentId", authMiddleware, async (req, res) => {
  try {
    const { newExpiryDate, notes } = req.body;

    if (!newExpiryDate) {
      return res.status(400).json({
        success: false,
        message: "New expiry date is required"
      });
    }

    const newDate = new Date(newExpiryDate);

    if (Number.isNaN(newDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid expiry date"
      });
    }

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

    if (document.status !== "Active") {
      return res.status(400).json({
        success: false,
        message: "Archived documents cannot be renewed"
      });
    }

    if (
      document.expiryDate &&
      newDate <= document.expiryDate
    ) {
      return res.status(400).json({
        success: false,
        message: "New expiry date must be after the current expiry date"
      });
    }

    const oldExpiryDate = document.expiryDate;

    // Save renewal history
    const history = await RenewalHistory.create({
      document: document._id,
      oldExpiryDate,
      newExpiryDate: newDate,
      notes
    });

    // Update document expiry date
    document.expiryDate = newDate;
    await document.save();

    // Remove old reminders and create new reminders
    await syncDocumentReminders(document);

    res.status(200).json({
      success: true,
      message: "Document renewed and new reminders generated successfully",
      document,
      renewalHistory: history
    });

  } catch (error) {
    console.error("Renewal error:", error.message);

    res.status(500).json({
      success: false,
      message: "Document renewal or reminder generation failed"
    });
  }
});

// Get renewal history for a document
router.get("/:documentId", authMiddleware, async (req, res) => {
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

    const history = await RenewalHistory.find({
      document: document._id
    }).sort({
      renewedOn: -1
    });

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });

  } catch (error) {
    console.error("Fetch renewal history error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch renewal history"
    });
  }
});

export default router;
