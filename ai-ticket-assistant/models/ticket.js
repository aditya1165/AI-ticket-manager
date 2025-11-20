import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["To-Do", "In Progress", "Completed"],
      default: "To-Do",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    priority: { type: String, enum: ["Low", "Medium", "High"], required: false },
    deadline: Date,
    helpfulNotes: String,
    relatedSkills: [String],
    comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        role: { type: String, enum: ["user", "moderator", "admin"], required: true },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for query optimization
ticketSchema.index({ createdBy: 1, updatedAt: -1 });
ticketSchema.index({ assignedTo: 1, updatedAt: -1 });
ticketSchema.index({ status: 1, updatedAt: -1 });

export default mongoose.model("Ticket", ticketSchema);
