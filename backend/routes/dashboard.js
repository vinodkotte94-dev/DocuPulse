
import express from "express";
import Document from "../models/Document.js";
import authMiddleware from "../middleware/auth.js";
import getExpiryStatus from "../utils/expiryStatus.js";

const router = express.Router();

router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const documents = await Document.find({
      user: req.userId
    });

    const activeDocuments = documents.filter(
      doc => doc.status === "Active"
    );

    const archivedDocuments = documents.filter(
      doc => doc.status === "Archived"
    );

    const expiredDocuments = documents.filter(
      doc => getExpiryStatus(doc.expiryDate) === "Expired"
    );

    const expiringSoonDocuments = documents.filter(
      doc => getExpiryStatus(doc.expiryDate) === "Expiring Soon"
    );

    const upcomingDocuments = documents.filter(
      doc => getExpiryStatus(doc.expiryDate) === "Upcoming"
    );

    const noExpiryDocuments = documents.filter(
      doc => getExpiryStatus(doc.expiryDate) === "No Expiry Date"
    );

    res.status(200).json({
      success: true,
      statistics: {
        totalDocuments: documents.length,
        activeDocuments: activeDocuments.length,
        archivedDocuments: archivedDocuments.length,
        expiredDocuments: expiredDocuments.length,
        expiringSoon: expiringSoonDocuments.length,
        upcomingDocuments: upcomingDocuments.length,
        noExpiryDate: noExpiryDocuments.length
      }
    });

  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics"
    });
  }
});

export default router;
