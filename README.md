# Play on Fitness — JP Nagar, Bengaluru

Full-stack fitness-centre web application and appointment booking platform for **Play on Fitness** (2nd Floor, 309, 100 Feet Ring Road, near Delmia Circle, JP Nagar, Bengaluru, Karnataka 560078).

## Key Features

- **Public Website**: Home, About, Services (9 configurable categories), Trainers, Gallery with Lightbox, Membership Plans, Contact & Directions.
- **7-Step Appointment Booking System**: Service & trainer selection, holiday/past-date blocking calendar, dynamic slot availability (`Asia/Kolkata` timezone), customer details, summary, and transaction-safe booking confirmation with unique `POF-...` references.
- **Customer Booking Management**: Self-service lookup, status view (`Pending`, `Confirmed`, `Cancelled`, `Completed`), cancellation, and live-slot rescheduling.
- **Owner Admin Dashboard (`/admin`)**: First-run owner account claim or passcode login, KPI overview, booking search/filters/rescheduling, service & trainer schedule management, membership plans, verified gallery photo uploads, customer enquiries, and business hours/holidays configuration.
- **SEO**: Semantic HTML, dynamic per-route titles/descriptions, `ExerciseGym` JSON-LD structured data, `/sitemap.xml`, and `/robots.txt`.

## Environment Variables

Copy `.env.example` to `.env` if running locally and configure as needed:

- `PORT` — Server port (defaults to `3000`).
- `SESSION_SECRET` — HMAC secret used to sign admin session tokens.
- `ADMIN_PASSCODE` — Optional server-side admin passcode override. When unset, `/admin` presents a one-time owner account setup form.
- `DB_PATH` — Optional SQLite database file path (defaults to `./data/playonfitness.db`).
- `SUPABASE_URL` / `SUPABASE_PROJECT_ID` — Your Supabase project URL or Project ID (e.g. `https://<project-id>.supabase.co`).
- `SUPABASE_PUBLISHABLE_KEY` — Your Supabase public publishable / anon API key.
- `SUPABASE_SERVICE_ROLE_KEY` — Optional server-only Supabase service role key.

## Supabase Database Setup

1. Open your **Supabase Dashboard → SQL Editor** and execute the SQL in `supabase/schema.sql` to create the `appointments`, `enquiries`, `services`, `trainers`, `membership_plans`, `gallery_images`, and `business_settings` tables along with Row Level Security policies.
2. Add `SUPABASE_URL` (or `SUPABASE_PROJECT_ID`) and `SUPABASE_PUBLISHABLE_KEY` to your environment secrets. All new bookings, cancellations, reschedules, enquiries, and admin updates will automatically sync to your Supabase project.

## Local Setup & Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the full-stack server (Express API + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```

## Production Build & Deployment

1. Build the frontend bundle:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   NODE_ENV=production npm start
   ```
