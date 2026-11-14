
import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true
    },

    daysBefore: {
      type: Number,
      required: true,
      enum: [30, 7, 1]
    },

    scheduledDate: {
      type: Date,
      required: true
    },

    sentAt: {
      type: Date,
      default: null
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: "reminders"
  }
);

reminderSchema.index(
  { document: 1, daysBefore: 1, scheduledDate: 1 },
  { unique: true }
);

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;
