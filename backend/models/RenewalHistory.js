
import mongoose from "mongoose";

const renewalHistorySchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true
    },

    oldExpiryDate: {
      type: Date,
      default: null
    },

    newExpiryDate: {
      type: Date,
      required: true
    },

    renewedOn: {
      type: Date,
      default: Date.now
    },

    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "renewalhistories"
  }
);

const RenewalHistory = mongoose.model(
  "RenewalHistory",
  renewalHistorySchema
);

export default RenewalHistory;
