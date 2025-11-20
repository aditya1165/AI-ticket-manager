// Add a comment to a ticket
import mongoose from "mongoose";
import { inngest } from "../inngest/client.js";
import Ticket from "../models/ticket.js";
import User from "../models/user.js";
import { sendMail } from "../utils/mailer.js";

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

    await inngest.send({
      name: "ticket/created",
      data: {
        ticketId: newTicket._id.toString(),
        title,
        description,
        createdBy: req.user._id.toString(),
      },
    });
    return res.status(201).json({
      message: "Ticket created and processing started",
      ticket: newTicket,
    });
  } catch (error) {
    console.error("Error creating ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    if (user.role === "admin") {
      tickets = await Ticket.find({})
        .populate("assignedTo", ["email", "_id"]) 
        .populate("createdBy", ["email", "_id"]) 
        .sort({ updatedAt: -1 })
        .lean();
    } else if (user.role === "moderator") {
      tickets = await Ticket.find({ assignedTo: user._id })
        .populate("assignedTo", ["email", "_id"]) 
        .populate("createdBy", ["email", "_id"]) 
        .sort({ updatedAt: -1 })
        .lean();
    } else {      
      tickets = await Ticket.find({ createdBy: user._id })
        .select("title description status createdAt updatedAt priority assignedTo deadline helpfulNotes relatedSkills")
        .populate("assignedTo", ["email", "_id"]) 
        .sort({ updatedAt: -1 })
        .lean();
    }
    return res.status(200).json(tickets);
  } catch (error) {
    console.error("Error fetching tickets", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getTicket = async (req, res) => {
  try {
    const user = req.user;
    let ticket;

    if (user.role !== "user") {
      ticket = await Ticket.findById(req.params.id)
        .populate("assignedTo", ["email", "_id"]) 
        .populate("createdBy", ["email", "_id"])
        .lean();
    } else {
      ticket = await Ticket.findOne({
        createdBy: user._id,
        _id: req.params.id,
      })
      .select("title description status createdAt updatedAt priority deadline helpfulNotes relatedSkills assignedTo")
      .populate("assignedTo", ["email", "_id"])
      .lean();
    }
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error("Error fetching ticket", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const addComment = async (req, res) => {
  const { text } = req.body;
  const { id } = req.params;
  const user = req.user;

  const ticket = await Ticket.findById(id).populate("assignedTo createdBy");
  if (!ticket) return res.status(404).json({ message: "Ticket not found" });

  // Only admin or assigned moderator can initiate
  if (ticket.comments.length === 0) {
    if (user.role === "admin" || (user.role === "moderator" && ticket.assignedTo && ticket.assignedTo.equals(user._id))) {
      // allow
    } else {
      return res.status(403).json({ message: "Not allowed to initiate comment" });
    }
  } else {
    // User can reply, but not initiate
    if (user.role === "user" && ticket.createdBy.equals(user._id)) {
      // allow
    } else if (user.role === "admin" || (user.role === "moderator" && ticket.assignedTo && ticket.assignedTo.equals(user._id))) {
      // allow
    } else {
      return res.status(403).json({ message: "Not allowed to comment" });
    }
  }

  ticket.comments.push({
    author: user._id,
    text,
    role: user.role,
    createdAt: new Date()
  });
  await ticket.save();

  // Email notification logic
  try {
    // If admin/moderator replies, notify user
    if ((user.role === "admin" || user.role === "moderator") && ticket.createdBy?.email) {
      await sendMail(
        ticket.createdBy.email,
        "New Comment on Your Ticket",
        `A new comment has been added on your ticket (${ticket.title || ticket._id}).\n\nComment: ${text}`
      );
    }
    // If user replies, notify assigned moderator or admin
    if (user.role === "user") {
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
    console.error("Error sending comment notification email:", err.message);
  }

  res.json({ comments: ticket.comments });
};

// Get all comments for a ticket
export const getComments = async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findById(id).populate({
    path: "comments.author",
    select: "username email role"
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

    const ticket = await Ticket.findById(id).populate("assignedTo createdBy");
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

    ticket.status = status;
    await ticket.save();
    return res.json({ message: "Status updated", ticket });
  } catch (err) {
    console.error("Error updating status", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
