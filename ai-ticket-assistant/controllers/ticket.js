// Add a comment to a ticket
import mongoose from "mongoose";
import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import { sendMail } from "../utils/mailer.js";
import { updateModeratorStats } from "../utils/intelligent-assignment.js";
import { getOrSet, del, CACHE_TTL, CACHE_KEYS, delPattern } from "../utils/cache.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }
    const newTicket = await Ticket.create({
      title,
      description,
      createdBy: req.user._id.toString(),
    });

    try {
      await inngest.send({
        name: "ticket/created",
        data: {
          ticketId: newTicket._id.toString(),
          title,
          description,
          createdBy: req.user._id.toString(),
        },
      });
    } catch (inngestErr) {
      // Inngest event send failed
    }

    // Invalidate ticket caches
    await delPattern('tickets:*');
    await delPattern('counts:*');

    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, status, priority, search } = req.query;

    // Create cache key based on user role, filters, and pagination
    const cacheKey = `tickets:list:${user.role}:${user._id}:p${page}:l${limit}:s${status || 'all'}:pr${priority || 'all'}:q${search || 'none'}`;

    // Use cache-aside pattern
    const cachedData = await getOrSet(
      cacheKey,
      async () => {
        const query = {};

        // 1. Role-based Access Control
        if (user.role === "moderator") {
          query.assignedTo = user._id;
        } else if (user.role === "user") {
          query.createdBy = user._id;
        }
        // Admin sees all tickets

        // 2. Filters
        if (status) query.status = status;
        if (priority) query.priority = priority;

        // 3. Search (if provided)
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        // 4. Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // 5. Build Projection & Population options
        let populateOptions = [
          { path: "assignedTo", select: "email username status" }, // Leaner selection
          { path: "createdBy", select: "email username status" },
        ];

        // For users, maybe exclude sensitive fields if needed
        let selectFields = ""; // Select all by default
        if (user.role === "user") {
          selectFields = "-comments -__v"; // Example: exclude heavy fields for list view
        }

        // 6. Execute Query (Parallel for performance)
        const [tickets, total] = await Promise.all([
          Ticket.find(query)
            .select(selectFields)
            .populate(populateOptions)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Ticket.countDocuments(query),
        ]);

        return {
          tickets,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limitNum),
          },
        };
      },
      CACHE_TTL.RECENT_TICKETS
    );

    return res.status(200).json(cachedData);
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", ["email", "_id", "status"]) 
        .populate("createdBy", ["email", "_id", "status"])
        .populate({
          path: "comments.author",
          select: "email username status"
        })
        .lean();
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
      .select("title description status createdAt updatedAt priority deadline helpfulNotes relatedSkills assignedTo comments")
      .populate("assignedTo", ["email", "_id", "status"])
      .populate({
        path: "comments.author",
        select: "email username status"
      })
      .lean();
    }
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addComment = async (req, res) => {
  const { text } = req.body;
  const { id } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Fetch full user data for email, username, and status
  const fullUser = await User.findById(userId).select("email username status");
  if (!fullUser) return res.status(404).json({ message: "User not found" });

  const ticket = await Ticket.findById(id).populate("assignedTo", "email _id status").populate("createdBy", "email _id status");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  // Only admin or assigned moderator can initiate
  if (ticket.comments.length === 0) {
    if (userRole === "admin" || (userRole === "moderator" && ticket.assignedTo && ticket.assignedTo.equals(userId))) {
      // allow
    } else {
      return res.status(403).json({ message: "Not allowed to initiate comment" });
    }
  } else {
    // User can reply, but not initiate
    if (userRole === "user" && ticket.createdBy.equals(userId)) {
      // allow
    } else if (userRole === "admin" || (userRole === "moderator" && ticket.assignedTo && ticket.assignedTo.equals(userId))) {
      // allow
    } else {
      return res.status(403).json({ message: "Not allowed to comment" });
    }
  }

  ticket.comments.push({
    author: userId,
    text,
    role: userRole,
    createdAt: new Date()
  });
  await ticket.save();

  // Emit real-time update to all clients viewing this ticket
  if (req.io) {
    req.io.to(`ticket_${id}`).emit("comment_added", {
      ticketId: id,
      comment: {
        author: { _id: userId, email: fullUser.email, username: fullUser.username, status: fullUser.status },
        text,
        role: userRole,
        createdAt: new Date()
      }
    });
  }

  // Email notification logic
  try {
    // If admin/moderator replies, notify user
    if ((userRole === "admin" || userRole === "moderator") && ticket.createdBy?.email) {
      await sendMail(
        ticket.createdBy.email,
        "New Comment on Your Ticket",
        `A new comment has been added on your ticket (${ticket.title || ticket._id}).\n\nComment: ${text}`
      );
    }
    // If user replies, notify assigned moderator or admin
    if (userRole === "user") {
      if (ticket.assignedTo?.email) {
        await sendMail(
          ticket.assignedTo.email,
          "New Comment on Assigned Ticket",
          `A new comment has been added on your ticket (${ticket.title || ticket._id}).\n\nComment: ${text}`
        );
      } else {
        // fallback: notify all admins
        const admins = await User.find({ role: "admin" });
        for (const admin of admins) {
          if (admin.email) {
            await sendMail(
              admin.email,
              "New Comment on Ticket",
              `A new comment has been added on your ticket (${ticket.title || ticket._id}).\n\nComment: ${text}`
            );
          }
        }
      }
    }
  } catch (err) {
    // Error sending comment notification email
  }

  // Invalidate ticket caches
  await delPattern('tickets:*');

  res.json({ comments: ticket.comments });
};

// Get all comments for a ticket
export const getComments = async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id).populate({
    path: "comments.author",
    select: "username email status"
  });
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  res.json({ comments: ticket.comments });
};

// Update ticket status
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["To-Do", "In Progress", "Completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ticket = await Ticket.findById(id).populate("assignedTo", "email _id status").populate("createdBy", "email _id status");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const user = req.user;
    const isOwner = ticket.createdBy && ticket.createdBy.equals(user._id);
    const isAssigned = ticket.assignedTo && ticket.assignedTo.equals(user._id);
    const isAdmin = user.role === "admin";
    const isModerator = user.role === "moderator";

    // Permissions: admin can update any; moderator only if assigned; regular users cannot update status
    if (!(isAdmin || (isModerator && isAssigned))) {
      return res.status(403).json({ message: "Not allowed to update status" });
    }

    const previousStatus = ticket.status;
    ticket.status = status;
    await ticket.save();

    // Update moderator statistics if ticket is completed
    if (status === "Completed" && previousStatus !== "Completed" && ticket.assignedTo) {
      await updateModeratorStats(
        ticket.assignedTo._id,
        ticket.createdAt,
        new Date()
      );
    }

    // Emit real-time update to all clients viewing this ticket
    if (req.io) {
      req.io.to(`ticket_${id}`).emit("status_updated", {
        ticketId: id,
        status: status
      });
    }

    // Invalidate ticket caches
    await delPattern('tickets:*');
    await delPattern('counts:*');

    return res.json({ message: "Status updated", ticket });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
