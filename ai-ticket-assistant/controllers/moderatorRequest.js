import ModeratorRequest from "../models/moderatorRequest.js";
import User from "../models/user.js";
import { sendMail } from "../utils/mailer.js";
import { del, CACHE_KEYS } from "../utils/cache.js";

export const createRequest = async (req, res) => {
  try {
    const { username, email, skills } = req.body;
    const applicantId = req.user._id;
    // Admins cannot apply to be moderator
    if (req.user.role === "admin") return res.status(400).json({ message: "Admins cannot apply to be moderators" });
    // Normalize skills: lowercase, trim, dedupe
    const skillsArrRaw = (skills || "").split(",").map((s) => s.trim()).filter(Boolean);
    const skillsArr = Array.from(new Set(skillsArrRaw.map((s) => s.toLowerCase()))).map((s) => s.replace(/\s+/g, " "));

    const existing = await ModeratorRequest.findOne({ applicant: applicantId, status: "pending" });
    if (existing) return res.status(400).json({ message: "You already have a pending request" });

    // Check for recent rejection cooldown (72 hours)
    const lastRejected = await ModeratorRequest.findOne({ applicant: applicantId, status: "rejected" }).sort({ rejectedAt: -1 });
    if (lastRejected && lastRejected.rejectedAt) {
      const diffMs = Date.now() - new Date(lastRejected.rejectedAt).getTime();
      const hours = diffMs / (1000 * 60 * 60);
      if (hours < 72) {
        const waitHours = Math.ceil(72 - hours);
        return res.status(400).json({ message: `You were recently rejected. Please wait ${waitHours} more hour(s) before reapplying.`, cooldownHours: waitHours });
      }
    }

    const reqDoc = await ModeratorRequest.create({ applicant: applicantId, username, email, skills: skillsArr });

    // notify applicant
    try {
      await sendMail(email, "Moderator request submitted", `Your request to become a moderator has been received and is pending review.`);
    } catch (e) {
      // Email notification failed
    }

    // notify first available moderator (async best-effort)
    try {
      const moderator = await User.findOne({ role: "moderator" }) || await User.findOne({ role: "admin" });
      if (moderator && moderator.email) {
        await sendMail(moderator.email, "New moderator application", `A new moderator application has been submitted by ${username} (${email}). Please review in the admin panel.`);
      }
    } catch (e) {
      // Reviewer notification failed
    }

    return res.status(201).json({ message: "Request created", request: reqDoc });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyRequest = async (req, res) => {
  try {
    const applicantId = req.user._id;
    const reqDoc = await ModeratorRequest.findOne({ applicant: applicantId }).sort({ createdAt: -1 });
    // If last rejected and within cooldown, include cooldown info
    let cooldownHours = 0;
    if (reqDoc && reqDoc.status === "rejected" && reqDoc.rejectedAt) {
      const diffMs = Date.now() - new Date(reqDoc.rejectedAt).getTime();
      const hours = diffMs / (1000 * 60 * 60);
      if (hours < 72) cooldownHours = Math.ceil(72 - hours);
    }
    return res.json({ request: reqDoc || null, cooldownHours });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const listRequests = async (req, res) => {
  try {
    // Only moderators and admins can view pending requests
    if (!["moderator", "admin"].includes(req.user.role)) return res.status(403).json({ message: "Not allowed" });
    const requests = await ModeratorRequest.find({ status: "pending" }).populate("applicant", ["username", "email", "skills"]).sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const decideRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ message: "Invalid action" });
    if (!["moderator", "admin"].includes(req.user.role)) return res.status(403).json({ message: "Not allowed" });

    const reqDoc = await ModeratorRequest.findById(id).populate("applicant");
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    reqDoc.status = action === "accept" ? "accepted" : "rejected";
    reqDoc.reviewedBy = req.user._id;
  if (action === "reject") reqDoc.rejectedAt = new Date();
    await reqDoc.save();

    // If accepted, update user role and add skills
    if (action === "accept") {
      const user = await User.findById(reqDoc.applicant._id);
      if (user) {
        user.role = "moderator";
        user.skills = Array.from(new Set([...(user.skills || []), ...(reqDoc.skills || [])]));
        await user.save();

        // Invalidate moderator cache when new moderator is added
        await del(CACHE_KEYS.moderatorsWithSkills());
        await del(CACHE_KEYS.moderatorSkills(user._id));
      }
    }

    // notify applicant
    try {
      await sendMail(reqDoc.email, `Moderator request ${reqDoc.status}`, `Your moderator request has been ${reqDoc.status}.`);
    } catch (e) {
      // Email notification failed
    }

    return res.json({ message: "Request processed", request: reqDoc });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
