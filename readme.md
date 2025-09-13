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
- **Background Processing**
   - Inngest for event-driven ticket analysis and assignment
- **Notifications**
   - Email notifications for ticket assignment, comments, and status changes
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



## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, DaisyUI
- **Backend:** Node.js, Express
- **Database:** MongoDB, Mongoose
- **AI:** Google Gemini API
- **Background Jobs:** Inngest
- **Email:** Nodemailer, Mailtrap

---

# AI-Powered Ticket Management System

A smart ticket management system that uses AI to automatically categorize, prioritize, and assign support tickets to the most appropriate moderators.

## 🚀 Features

- **AI-Powered Ticket Processing**

  - Automatic ticket categorization
  - Smart priority assignment
  - Skill-based moderator matching
  - AI-generated helpful notes for moderators

- **Smart Moderator Assignment**

  - Automatic matching of tickets to moderators based on skills
  - Fallback to admin assignment if no matching moderator found
  - Skill-based routing system

- **User Management**

  - Role-based access control (User, Moderator, Admin)
  - Skill management for moderators
  - User authentication with JWT

- **Background Processing**
  - Event-driven architecture using Inngest
  - Automated email notifications
  - Asynchronous ticket processing

## 🛠️ Tech Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT
- **Background Jobs**: Inngest
- **AI Integration**: Google Gemini API
- **Email**: Nodemailer with Mailtrap
- **Development**: Nodemon for hot reloading

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Google Gemini API key
- Mailtrap account (for email testing)

