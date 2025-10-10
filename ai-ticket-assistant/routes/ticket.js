import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { createTicket, getTicket, getTickets, addComment, getComments, updateTicketStatus } from "../controllers/ticket.js";

const router = express.Router();


router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.post("/", authenticate, createTicket);

// Comments endpoints
router.post("/:id/comments", authenticate, addComment);
router.get("/:id/comments", authenticate, getComments);

// Status update
router.patch("/:id/status", authenticate, updateTicketStatus);

export default router;
