import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import { serve } from "inngest/express";
import userRoutes from "./routes/user.js";
import ticketRoutes from "./routes/ticket.js";
import modReqRoutes from "./routes/moderatorRequest.js";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/functions/on-signup.js";
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js";
import rateLimit from 'express-rate-limit';
import { createServer } from "http";
import { Server } from "socket.io";
import { initRedis, set, CACHE_TTL, CACHE_KEYS } from "./utils/cache.js";
import User from "./models/user.js";
import Ticket from "./models/ticket.js";

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  
  socket.on("join_ticket", (ticketId) => {
    socket.join(`ticket_${ticketId}`);
  });

  socket.on("leave_ticket", (ticketId) => {
    socket.leave(`ticket_${ticketId}`);
  });

  socket.on("disconnect", () => {
    // User disconnected
  });
});

// Attach io to req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// CORS first to ensure headers are present even if rate-limited or errored
app.use(cors());

// Rate limiting: 500 requests per 15 minutes (reasonable for authenticated app with real-time features)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

// Response compression for performance
app.use(compression());
app.use(express.json());
// Optional: serve built frontend and fallback to index.html for client-side routes
import fs from "fs";
import path from "path";

// detect common frontend build locations
const possibleFrontendPaths = [
  path.join(process.cwd(), "../ai-ticket-frontend/dist"),
  path.join(process.cwd(), "./dist"),
];

let frontendDist = null;
for (const p of possibleFrontendPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
    frontendDist = p;
    break;
  }
}

if (frontendDist) {
  app.use(express.static(frontendDist));

  // SPA fallback: for any non-API GET request, serve index.html
  app.get("/*", (req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}
// Health and readiness endpoints for Render / health checks
app.get("/", (req, res) => res.send({ status: "ok", service: "ai-ticket-assistant" }));
app.get("/api/health", (req, res) => res.send({ status: "ok" }));
app.use("/api/auth", userRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/mod-requests", modReqRoutes);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [onUserSignup, onTicketCreated],
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    // Initialize Redis cache (optional - gracefully degrades if unavailable)
    try {
      const redisConnected = await initRedis();
      
      if (redisConnected) {
        // Cache warming: Pre-populate frequently accessed data
        try {
          // Warm cache with moderator list
          const moderators = await User.find({ 
            role: { $in: ["moderator", "admin"] }
          }).lean();
          await set(CACHE_KEYS.moderatorsWithSkills(), moderators, CACHE_TTL.MODERATOR_LIST);

          // Warm cache with recent ticket counts for quick dashboard loads
          const ticketCounts = {
            total: await Ticket.countDocuments({}),
            todo: await Ticket.countDocuments({ status: "To-Do" }),
            inProgress: await Ticket.countDocuments({ status: "In Progress" }),
            completed: await Ticket.countDocuments({ status: "Completed" })
          };
          await set('counts:tickets:global', ticketCounts, CACHE_TTL.TICKET_COUNTS);

        } catch (cacheError) {
          // Cache warming failed, but app can still run
        }
      }
    } catch (redisError) {
      // Redis initialization failed - app continues without caching
    }

    httpServer.listen(PORT,"0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
