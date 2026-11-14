
import express from "express";
import fs from "fs";
import path from "path";

import Document from "../models/Document.js";
import Reminder from "../models/Reminder.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import getExpiryStatus from "../utils/expiryStatus.js";

const router = express.Router();

const uploadFolder = path.join(process.cwd(), "uploads");

// Helper: delete an uploaded file
const deleteUploadedFile = (storedName) => {
  if (!storedName) return;

  const filePath = path.join(uploadFolder, storedName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Helper: generate or replace expiry reminders
const syncDocumentReminders = async (document) => {
  try {
    // Remove previous reminders for this document
    await Reminder.deleteMany({
      document: document._id
    });

    // Archived documents and documents without expiry dates
    // should not receive reminders.
    if (document.status === "Archived" || !document.expiryDate) {
      return true;
    }

    const daysBeforeList = [30, 7, 1];
    const remindersToCreate = [];

    for (const daysBefore of daysBeforeList) {
      const scheduledDate = new Date(document.expiryDate);

      scheduledDate.setDate(
        scheduledDate.getDate() - daysBefore
      );

      // Set reminder time to 9 AM
      scheduledDate.setHours(9, 0, 0, 0);

      // Do not create reminders for dates that have already passed
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

    return true;

  } catch (error) {
    console.error(
      "Automatic reminder generation error:",
      error.message
    );

    return false;
  }
};

// CREATE a document with optional file upload
router.post(
  "/",
  authMiddleware,
  upload.single("documentFile"),
  async (req, res) => {
    try {
      const {
        name,
        category,
        issuer,
        referenceNumber,
        issueDate,
        expiryDate
      } = req.body;

      if (!name || !category) {
        if (req.file) deleteUploadedFile(req.file.filename);

        return res.status(400).json({
          success: false,
          message: "Document name and category are required"
        });
      }

      const issue = issueDate ? new Date(issueDate) : null;
      const expiry = expiryDate ? new Date(expiryDate) : null;

      if (
        (issue && Number.isNaN(issue.getTime())) ||
        (expiry && Number.isNaN(expiry.getTime()))
      ) {
        if (req.file) deleteUploadedFile(req.file.filename);

        return res.status(400).json({
          success: false,
          message: "Please provide valid dates"
        });
      }

      if (issue && expiry && expiry < issue) {
        if (req.file) deleteUploadedFile(req.file.filename);

        return res.status(400).json({
          success: false,
          message: "Expiry date cannot be before issue date"
        });
      }

      const fileData = req.file
        ? {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            size: req.file.size
          }
        : undefined;

      const document = await Document.create({
        user: req.userId,
        name,
        category,
        issuer,
        referenceNumber,
        issueDate: issue,
        expiryDate: expiry,
        ...(fileData ? { file: fileData } : {})
      });

      // Automatically generate expiry reminders
      const remindersGenerated =
        await syncDocumentReminders(document);

      res.status(201).json({
        success: true,
        message: remindersGenerated
          ? "Document added successfully. Expiry reminders generated."
          : "Document added successfully, but reminder generation failed.",
        document
      });

    } catch (error) {
      if (req.file) deleteUploadedFile(req.file.filename);

      console.error("Create document error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to add document"
      });
    }
  }
);

// READ all documents belonging to the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const documents = await Document.find({
      user: req.userId
    }).sort({ createdAt: -1 });

    const documentsWithStatus = documents.map((doc) => {
      const document = doc.toObject();
      document.expiryStatus = getExpiryStatus(doc.expiryDate);
      return document;
    });

    res.status(200).json({
      success: true,
      count: documentsWithStatus.length,
      documents: documentsWithStatus
    });

  } catch (error) {
    console.error("Get documents error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch documents"
    });
  }
});

// READ one document
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    const documentWithStatus = document.toObject();

    documentWithStatus.expiryStatus = getExpiryStatus(
      document.expiryDate
    );

    res.status(200).json({
      success: true,
      document: documentWithStatus
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid document ID"
    });
  }
});

// UPDATE document details
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "category",
      "issuer",
      "referenceNumber",
      "issueDate",
      "expiryDate"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.issueDate !== undefined) {
      updates.issueDate = updates.issueDate
        ? new Date(updates.issueDate)
        : null;
    }

    if (updates.expiryDate !== undefined) {
      updates.expiryDate = updates.expiryDate
        ? new Date(updates.expiryDate)
        : null;
    }

    if (
      (updates.issueDate &&
        Number.isNaN(updates.issueDate.getTime())) ||
      (updates.expiryDate &&
        Number.isNaN(updates.expiryDate.getTime()))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid dates"
      });
    }

    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    const finalIssueDate =
      updates.issueDate !== undefined
        ? updates.issueDate
        : document.issueDate;

    const finalExpiryDate =
      updates.expiryDate !== undefined
        ? updates.expiryDate
        : document.expiryDate;

    if (
      finalIssueDate &&
      finalExpiryDate &&
      finalExpiryDate < finalIssueDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Expiry date cannot be before issue date"
      });
    }

    // Check whether the expiry date actually changed
    const expiryDateChanged =
      updates.expiryDate !== undefined &&
      (
        (document.expiryDate
          ? new Date(document.expiryDate).getTime()
          : null) !==
        (updates.expiryDate
          ? updates.expiryDate.getTime()
          : null)
      );

    Object.assign(document, updates);

    await document.save();

    let remindersGenerated = true;

    // Replace reminders only when expiry date changes
    if (expiryDateChanged) {
      remindersGenerated =
        await syncDocumentReminders(document);
    }

    res.status(200).json({
      success: true,
      message: expiryDateChanged && !remindersGenerated
        ? "Document updated, but reminder generation failed."
        : "Document updated successfully",
      document
    });

  } catch (error) {
    console.error("Update document error:", error.message);

    res.status(400).json({
      success: false,
      message: "Failed to update document"
    });
  }
});

// ARCHIVE a document
router.patch("/:id/archive", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (document.status === "Archived") {
      return res.status(400).json({
        success: false,
        message: "Document is already archived"
      });
    }

    document.status = "Archived";
    await document.save();

    // Remove reminders when the document is archived
    await Reminder.deleteMany({
      document: document._id
    });

    res.status(200).json({
      success: true,
      message: "Document archived successfully",
      document
    });

  } catch (error) {
    console.error("Archive document error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to archive document"
    });
  }
});

// RESTORE an archived document
router.patch("/:id/restore", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (document.status !== "Archived") {
      return res.status(400).json({
        success: false,
        message: "Document is not archived"
      });
    }

    document.status = "Active";
    await document.save();

    // Generate reminders again after restoration
    const remindersGenerated =
      await syncDocumentReminders(document);

    res.status(200).json({
      success: true,
      message: remindersGenerated
        ? "Document restored and reminders generated successfully."
        : "Document restored, but reminder generation failed.",
      document
    });

  } catch (error) {
    console.error("Restore document error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to restore document"
    });
  }
});

// UPLOAD or replace a document file
router.post(
  "/:id/upload",
  authMiddleware,
  upload.single("documentFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a file to upload"
        });
      }

      const document = await Document.findOne({
        _id: req.params.id,
        user: req.userId
      });

      if (!document) {
        deleteUploadedFile(req.file.filename);

        return res.status(404).json({
          success: false,
          message: "Document not found"
        });
      }

      const oldStoredName = document.file?.storedName;

      document.file = {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size
      };

      await document.save();

      if (oldStoredName) {
        deleteUploadedFile(oldStoredName);
      }

      res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        file: document.file
      });

    } catch (error) {
      if (req.file) deleteUploadedFile(req.file.filename);

      console.error("File upload error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to upload file"
      });
    }
  }
);

// VIEW or DOWNLOAD an uploaded file
router.get("/:id/file", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document || !document.file?.storedName) {
      return res.status(404).json({
        success: false,
        message: "Uploaded file not found"
      });
    }

    const filePath = path.join(
      uploadFolder,
      document.file.storedName
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File is missing from storage"
      });
    }

    res.setHeader(
      "Content-Type",
      document.file.mimeType
    );

    res.setHeader(
      "Content-Disposition",
      `${
        req.query.download === "true"
          ? "attachment"
          : "inline"
      }; filename*=UTF-8''${encodeURIComponent(
        document.file.originalName
      )}`
    );

    res.sendFile(filePath);

  } catch (error) {
    console.error("File retrieval error:", error.message);

    res.status(400).json({
      success: false,
      message: "Unable to retrieve file"
    });
  }
});

// DELETE uploaded file only
router.delete("/:id/file", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document || !document.file?.storedName) {
      return res.status(404).json({
        success: false,
        message: "Uploaded file not found"
      });
    }

    deleteUploadedFile(document.file.storedName);

    document.file = {
      originalName: null,
      storedName: null,
      mimeType: null,
      size: null
    };

    await document.save();

    res.status(200).json({
      success: true,
      message: "Uploaded file deleted successfully"
    });

  } catch (error) {
    console.error("File deletion error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete uploaded file"
    });
  }
});

// DELETE a document and its uploaded file permanently
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    if (document.file?.storedName) {
      deleteUploadedFile(document.file.storedName);
    }

    // Remove associated reminders
    await Reminder.deleteMany({
      document: document._id
    });

    await Document.deleteOne({
      _id: document._id
    });

    res.status(200).json({
      success: true,
      message: "Document and uploaded file deleted successfully"
    });

  } catch (error) {
    console.error("Delete document error:", error.message);

    res.status(400).json({
      success: false,
      message: "Failed to delete document"
    });
  }
});

export default router;
