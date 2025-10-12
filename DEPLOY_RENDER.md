Render deployment guide for AI-ticket-system

This document lists exact Render service settings, environment variables, and commands to deploy the project:

Overview
- We'll deploy three services on Render:
  1. Backend API: `ai-ticket-assistant` (Web Service)
  2. Inngest worker: `ai-ticket-worker` (Background Worker)
  3. Frontend: `ai-ticket-frontend` (Static Site)
  4. Database: MongoDB Atlas (managed) — do NOT run MongoDB on Render

Backend API (ai-ticket-assistant)
- Git repo: point to this repository and the `master` branch
- Root Directory: `ai-ticket-assistant`
- Environment:
  - MONGO_URI (mongodb+srv://...)
  - JWT_SECRET
  - MAIL_API_KEY (SendGrid)
  - MAIL_FROM
  - MAIL_API_PROVIDER=sendgrid
  - INNGEST_API_KEY (preferred for production) or INNGEST_SIGNING_KEY
  - GEMINI_API_KEY (optional)
  - NODE_ENV=production
- Build Command:
  - cd ai-ticket-assistant && npm ci
- Start Command:
  - cd ai-ticket-assistant && npm start
- Health check path: `/api/health`
- Instance: Start with 1x CPU
- Notes: Configure VPC peering to Atlas if available.

Inngest Worker (ai-ticket-worker)
- Git repo: same repository
- Root Directory: `ai-ticket-assistant`
- Environment: same as backend (MONGO_URI, INNGEST_API_KEY, MAIL_API_KEY...)
- Build Command:
  - cd ai-ticket-assistant && npm ci
- Start Command:
  - cd ai-ticket-assistant && npm run inngest-start
- Type: Background Worker
- Notes: Use INNGEST_API_KEY for Inngest Cloud. If self-hosting, ensure signing key & event keys are provided.

Frontend (ai-ticket-frontend)
- Type: Static Site
- Root Directory: `ai-ticket-frontend`
- Build Command:
  - cd ai-ticket-frontend && npm ci && npm run build
- Publish Directory:
  - ai-ticket-frontend/dist
- Environment:
  - VITE_SERVER_URL=https://<your-backend>.onrender.com/api

MongoDB
- Use MongoDB Atlas. Create a cluster and add the user.
- Put the connection string into Render's MONGO_URI.

Quick test checklist after deploy
1. Open backend `https://<backend>.onrender.com/api/health` and expect `{ status: 'ok' }`.
2. Trigger signup/login from frontend; verify API responses.
3. Create a ticket to trigger Inngest and check worker logs.
4. Send a test email (mailer) and confirm SendGrid accepted it.

Security
- Store all secrets in Render Environment; never commit `.env`.
- Use HTTPS and custom domains if needed.

Troubleshooting
- If Inngest worker fails with "event-key" errors, ensure `INNGEST_API_KEY` is present for production start. For local dev use `npm run inngest-dev`.

Contact
- If you'd like, I can create a Render settings JSON or helper scripts to automate creating these services via the Render API.