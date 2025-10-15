# Ticket.io

AI-powered Ticket Management System

---

## Features

- **User Authentication & Authorization**
   - JWT-based login/signup
   - Role-based access: User, Moderator, Admin
- **Ticket Management**
   - Create, view, and track support tickets
   - Skill-based moderator assignment
   - AI-generated ticket priority, notes, and skill extraction
- **Comments & Chat**
   - Admin/moderator can initiate chat on tickets
   - Users can reply to comments
   - Real-time chat-like UI for ticket discussions
   - Email notifications for new comments
- **Admin Dashboard**
   - View all users and tickets
   - Update user roles and skills
- **Moderator Application & Review Workflow**
   - Users can apply to become moderators through the frontend (skills as comma-separated list)
   - Admins/Moderators can review pending moderator applications, accept or reject
   - Accepted applicants are upgraded to the `moderator` role and their skills are merged into their profile
   - Applicants receive email notifications on submission and on decision
   - Endpoints: POST `/api/mod-requests` (apply), GET `/api/mod-requests/me` (applicant view), GET `/api/mod-requests` (list pending), POST `/api/mod-requests/:id/decide` (accept/reject)
- **Background Processing**
   - Inngest for event-driven ticket analysis and assignment
- **Notifications**
  - Email notifications for ticket assignment, comments, status changes and moderator workflow
  - Email sending now uses SendGrid HTTP API (set MAIL_API_KEY / SENDGRID_API_KEY and MAIL_FROM)
- **Frontend**
   - Modern React UI with Vite and Tailwind/DaisyUI
   - Responsive design
   - Pagination and sorting for tickets
- **Backend**
   - Node.js + Express REST API
   - MongoDB with Mongoose
   - Modular controllers, models, routes, and middlewares

---

## Usage

- **Sign Up:** Create a new user, moderator, or admin account.
- **Login:** Access your dashboard and tickets.
- **Create Ticket:** Submit a new support ticket.
- **Ticket Assignment:** AI matches ticket to moderator/admin based on skills.
- **Comment/Chat:** Admin/moderator can start a chat; users can reply.
- **Email Notifications:** Get notified for ticket assignment and new comments.
- **Admin Panel:** Manage users, roles, and view all tickets.
 - **Apply to Become Moderator:** Logged-in users (non-admin) can apply from the navbar -> Apply Moderator. Fill skills (comma-separated) and submit. Admins and moderators can review pending requests in the admin panel.



## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, DaisyUI
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **AI:** Google Gemini API
- **Background Jobs:** Inngest
- **Email:** Nodemailer, Mailtrap

Note: The mailer was updated to prefer the SendGrid HTTP API. The project previously used nodemailer for SMTP testing; the production path uses SendGrid. Configure environment variables accordingly.
---

## Live demo

The project is live at: https://ai-ticket-manager-frontend.onrender.com/login

Test credentials (pre-created account):

- id: testuser@example.com
- pass: password123

You can also create your own account from the Signup page and create tickets on your own — the app supports signing up, logging in, creating tickets, and receiving email notifications (when mailer is configured).

---

