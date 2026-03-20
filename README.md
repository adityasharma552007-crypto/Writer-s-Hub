# Writer's Hub

Writer's Hub is a modern, full-stack writing and community platform built using React, Vite, and Express, with Supabase for data and authentication.

## Features
- **Clean Modern UI**: Designed for the best reading and writing experience.
- **Authentication**: Secure user login and registration powered by JWT and Supabase.
- **Author Dashboard**: Manage your writings, drafts, and profile.
- **Community Capabilities**: Explore trending posts, join communities, and interact via feeds.
- **Personalized Shelf**: Organize and bookmark your favorite entries and reads.
- **Notifications & Search**: Stay updated and find exactly what you're looking for with built-in search.
- **Rich Media**: Support for file and image uploads.

## Tech Stack

### Frontend (Client)
- **Framework**: React 19 powered by Vite
- **Routing**: React Router DOM v6
- **Data Fetching**: Axios
- **Styling**: Vanilla CSS / Tailwind (Responsive Design)

### Backend (Server)
- **Runtime**: Node.js & Express
- **Database / Auth**: Supabase (PostgreSQL)
- **Security**: Bcrypt for hashing, JSON Web Tokens (JWT)
- **File Uploads**: Multer
- **Utilities**: CORS, dotenv, string-similarity

## Setup & Local Development

This project uses npm workspaces to manage both frontend and backend from the root.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Make sure you have your `.env` configured inside the `server/` and `client/` directories based on the `.env.example` files.

3. **Run both client and server concurrently:**
   ```bash
   npm run dev
   ```

## Status
The application is actively being developed. Its backend has been largely decoupled from MongoDB and migrated over to Supabase.
