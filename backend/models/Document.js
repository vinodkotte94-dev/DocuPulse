
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    issuer: {
      type: String,
      trim: true
    },

    referenceNumber: {
      type: String,
      trim: true
    },

    issueDate: {
      type: Date,
      default: null
    },

    expiryDate: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active"
    },

    // Uploaded file information
    file: {
      originalName: {
        type: String,
        default: null
      },

      storedName: {
        type: String,
        default: null
      },

      mimeType: {
        type: String,
        default: null
      },

      size: {
        type: Number,
        default: null
      }
    }
  },
  {
    timestamps: true,
    collection: "documents"
  }
);

documentSchema.index({ user: 1, expiryDate: 1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;
