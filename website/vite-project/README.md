# Role-Based Admin Dashboard (MVP)

This project is a role-based CMS dashboard built with:

- React + Vite
- Tailwind CSS
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- ImageKit (for image uploads)

## Implemented MVP

- Secure email/password login
- Role fetch from `users/{uid}` document
- Protected routes with role guards
- Super Admin module:
  - View admins
  - Create admin with credentials
  - Change admin role
  - Delete admin user document
- Notice Admin module (`notices`): add/edit/delete/view records
- TNP Admin module (`placements`): add/edit/delete/view records
- Event Admin module (`events`): add/edit/delete/view records
- Timetable route placeholder (functionality pending)

## Roles

- `superadmin`
- `notice_admin`
- `tnp_admin`
- `event_admin`
- `timetable_admin`

## Setup

1. Install dependencies:

	npm install

2. Create `.env` from `.env.example` and fill Firebase keys.

3. Configure ImageKit env keys:

	- `VITE_IMAGEKIT_UPLOAD_ENDPOINT` (optional; defaults to `/api/imagekit/upload` in local development)
	- `VITE_IMAGEKIT_URL_ENDPOINT` (optional, for rendering via ImageKit URL)
	- `.env.server.local` for server-side ImageKit keys

4. Run the app:
	npm run dev

	Run upload server in another terminal:

	npm run dev:server

	Or run both together:

	npm run dev:full

5. Build for production:

	npm run build

## First Super Admin Bootstrap (Manual)

1. In Firebase Authentication, create one user (email/password).
2. In Firestore create `users/{uid}` for that user with:

	- `name`
	- `email`
	- `role: "superadmin"`
	- `createdBy: "system_bootstrap"`
	- `isActive: true`

3. Login from `/login` using that user.

## Security Rules

- Firestore rules: `firestore.rules`
- Storage rules: `storage.rules`

Deploy these rules from Firebase CLI to enforce backend permissions.

## Image Upload Flow

- All uploaded files (images + notice PDFs) are uploaded via local backend to ImageKit.
- Firestore stores only file URL + identifier metadata.
- Existing old Firebase file paths (if any) are still safely deletable.

Do not put ImageKit private key in frontend env files. Keep private key only in `.env.server.local`.
