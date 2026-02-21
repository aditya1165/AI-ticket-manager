import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";
import { del, CACHE_KEYS } from "../utils/cache.js";

export const signup = async (req, res) => {
  const { username,email, password, skills = [], role = "user" } = req.body;
  try {
    // Check if this is the first user - make them admin
    const userCount = await User.countDocuments({});
    const userRole = userCount === 0 ? "admin" : role;
    
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username, 
      email, 
      password: hashed, 
      skills,
      role: userRole,
      status: "online",
      lastSeen: new Date()
    });

    //Fire inngest event
    try {
      await inngest.send({
        name: "user/signup",
        data: {
          email
        },
      });
    } catch (e) {
      // connecting to inngest failed
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Signup failed", details: error.message });
  }
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if (!user) return res.status(401).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set user status to online on login
    user.status = "online";
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorzed" });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ error: "Unauthorized" });
    });
    res.json({ message: "Logout successfully" });

  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ eeor: "Forbidden" });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "User not found" });

    await User.updateOne(
      { email },
      { skills: skills.length ? skills : user.skills, role }
    );

    // Invalidate moderator cache if role or skills changed
    await del(CACHE_KEYS.moderatorsWithSkills());
    await del(CACHE_KEYS.moderatorSkills(user._id));

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const users = await User.find().select("-password").lean();
    return res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Update failed", details: error.message });
  }
};
// Update user status (online, offline, dnd)
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["online", "offline", "dnd"];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be one of: online, offline, dnd" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = status;
    user.lastSeen = new Date();
    await user.save();

    // Emit real-time status update via WebSocket
    if (req.io) {
      req.io.emit("user_status_changed", {
        userId: user._id,
        status: user.status,
        lastSeen: user.lastSeen
      });
    }

    return res.json({ 
      message: "Status updated successfully", 
      status: user.status,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update status", details: error.message });
  }
};
