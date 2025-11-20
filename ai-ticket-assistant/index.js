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

import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Response compression for performance
app.use(compression());
app.use(cors());
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
  console.log(`Serving frontend from ${frontendDist}`);
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
  .then(() => {
    app.listen(PORT,"0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB error: ", err));
