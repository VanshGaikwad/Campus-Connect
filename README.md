# 🎓 Campus Connect

**A unified academic interaction platform** – mobile app for students & faculty, plus an admin dashboard for campus management. Built as a monorepo with React Native, React, Firebase, and Vite.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Admin Roles & Capabilities](#admin-roles--capabilities)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Author](#author)
- [License](#license)

---

## 🔍 Overview

**Campus Connect** bridges the gap between campus administration and the student/faculty community. It centralises:

- **Notices & Announcements**
- **Event Management**
- **Placement / Recruitment Updates**
- **Timetable Access**
- **Role‑based Content Management**

The project is split into two complementary applications, sharing a single Firebase backend:

| Component | Tech Stack | Purpose |
|-----------|------------|---------|
| **Mobile App** (`/app`) | Expo · React Native · Firebase | Student/faculty experience – real‑time updates, notifications, and access to campus resources. |
| **Admin Dashboard** (`/website`) | React · Vite · Tailwind · Firebase | Secure, role‑based CMS for administrators to create, edit, and publish content. |

---

## 🧱 Architecture

```
Campus-Connect/
├── app/                          # Expo React Native mobile app
│   ├── src/                      # Main application code
│   ├── functions/                # Firebase Cloud Functions (backend logic)
│   ├── modules/                  # Feature modules (notifications, etc.)
│   └── assets/                   # Shared images, fonts, etc.
│
└── website/
    └── vite-project/             # Vite React admin dashboard
        ├── src/                  # Dashboard UI components & pages
        ├── server/               # Local upload server (ImageKit integration)
        └── public/               # Static assets
```

**Key Integrations:**
- **Firebase** – Authentication, Firestore (NoSQL DB), Cloud Functions, and Cloud Messaging.
- **ImageKit** – Media upload and delivery (supports images and PDFs).
- **Role‑Based Access Control** – Granular permissions for different admin types.

---

## ✨ Features

### 📱 Mobile App (Students & Faculty)
- Real‑time campus notices and announcements.
- Event listings with details and RSVP.
- Placement / recruitment information.
- Timetable viewing (work in progress).
- Push notifications via Firebase Cloud Messaging.

### 🖥️ Admin Dashboard
- Secure login with role‑based redirection.
- Dedicated content modules for each admin role.
- Image & PDF uploads through ImageKit (with a local Node.js proxy server).
- Production‑ready build with Vite and Tailwind CSS.

---

## 🛠️ Tech Stack

| Area | Technologies |
|------|--------------|
| **Mobile** | React Native (Expo), Firebase SDK |
| **Dashboard** | React, Vite, Tailwind CSS |
| **Backend** | Firebase Auth, Firestore, Cloud Functions |
| **Media** | ImageKit (upload & delivery) |
| **Monorepo** | Custom structure with shared config |
| **Deployment** | Firebase Hosting (optional), Vercel/Netlify (optional) |

---

## 🔐 Admin Roles & Capabilities

The dashboard implements a **secure, role‑based CMS** with the following admin types:

| Role | Permissions |
|------|-------------|
| **Super Admin** | View all admins, create admin credentials, change roles, delete admin users. |
| **Notice Admin** | Full CRUD on campus notices. |
| **TNP Admin** | Full CRUD on placement/recruitment records. |
| **Event Admin** | Full CRUD on campus events. |
| **Timetable Admin** | Timetable management (functionality in progress). |

**Security enforcement:**
- Email/password authentication via Firebase Auth.
- Role stored in Firestore (`users/{uid}`).
- Protected routes with role‑based guards.
- Firestore & Storage security rules deployed via Firebase CLI.

---

## 🚀 Local Development

### Prerequisites
- Node.js (v18 or later recommended)
- npm or yarn
- Firebase CLI (optional, for deploying security rules)
- Expo CLI (for mobile development)

### 1️⃣ Mobile App
```bash
cd app
npm install
npm start
```
> Runs the Expo development server. Scan the QR code with Expo Go on your device.

### 2️⃣ Admin Dashboard
```bash
cd website/vite-project
npm install
npm run dev          # Starts the dashboard at http://localhost:5173
npm run dev:server   # Starts the upload server (separate terminal)
# Or run both together:
npm run dev:full
```
> The upload server handles ImageKit uploads securely – it must be running for image/PDF uploads to work.

---

## 🔒 Environment Variables

Create a `.env` file in both the app and dashboard roots, using the provided `.env.example` as a template.

**Firebase Configuration** (required for both):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

**ImageKit (server‑side only)** – create `.env.server.local` inside `website/vite-project/server/`:
```
IMAGEKIT_PUBLIC_KEY=...
IMAGEKIT_PRIVATE_KEY=...
IMAGEKIT_URL_ENDPOINT=...
```

> ⚠️ **Never commit sensitive keys to version control.** Add `.env*` to your `.gitignore`.

---

## 📦 Deployment

### Dashboard Production Build
```bash
cd website/vite-project
npm run build
```
The output is in `dist/`, ready to be deployed to any static host (Vercel, Netlify, Firebase Hosting).

### Firebase Security Rules
Deploy the latest Firestore and Storage rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### First Super Admin Bootstrap
1. Create a user in Firebase Authentication (email/password).
2. In Firestore, create a document in the `users` collection with the UID:
   - `name`, `email`, `role: "superadmin"`
   - `createdBy: "system_bootstrap"`, `isActive: true`
3. Log in at `/login` with that user – you will have full super admin access.

---

## 👤 Author

**Vansh Gaikwad**  
[GitHub](https://github.com/VanshGaikwad)

---

## 📄 License

This project is for demonstration and educational purposes. Contact the author for licensing inquiries.

---

> Built with ❤️ using React Native, React, Firebase, and Vite – a complete campus engagement solution from mobile to management.
