import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "user", enum: ["user", "moderator", "admin"] },
  skills: [String],
  status: { type: String, default: "offline", enum: ["online", "offline", "dnd"] },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  
  // Performance tracking for intelligent load balancing
  totalTicketsResolved: { type: Number, default: 0 },
  averageResolutionTimeHours: { type: Number, default: 24 }, // Default 24 hours
  lastAssignedAt: { type: Date, default: null },
});

// Indexes for query optimization
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export default mongoose.model("User", userSchema);
