# Unified Academic Interaction Platform - Campus Connect

Monorepo for the campus engagement system with two parts:

- `app/` - Expo React Native mobile app
- `website/` - Vite React admin dashboard and backend

## Structure

- Student and faculty mobile experience
- Admin dashboard for notices, events, placements, and timetable management
- Firebase-backed data, auth, and notifications

## Local Setup

Install and run each project from its own folder.

### Mobile App

```bash
cd app
npm install
npm start
```

### Website Dashboard

```bash
cd website/vite-project
npm install
npm run dev
```

## Notes

- Keep sensitive Firebase and local environment values out of version control.
- The repository is organized as a monorepo so both apps can evolve together.