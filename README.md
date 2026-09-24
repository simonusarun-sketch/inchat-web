# InChat — real Supabase + Vercel deployment

This is a working Next.js app: **Create Account**, **Log In**, and **Search by InChat ID**
are backed by real Supabase Auth + a real Postgres `profiles` table (not a simulation).
Chats/Nearby/Cloud tabs are still UI-only — those are the next build milestone.

## 1. Create the Supabase project (2 min)
1. Go to https://supabase.com/dashboard → **New project**.
2. Pick a name, a database password (save it), and a region.
3. Wait ~2 min for provisioning.

## 2. Run the schema (1 min)
1. In your project, open **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` from this project.
3. Click **Run**. This creates the `profiles` and `contacts` tables with row-level
   security so search is public but writes are locked to each user's own row.

## 3. Turn off email confirmation for now (optional, recommended for testing)
Go to **Authentication → Providers → Email** and turn off "Confirm email" so new
accounts can log in immediately. Turn it back on before you launch for real users.

## 4. Get your API keys
**Project Settings → API** → copy:
- `Project URL`
- `anon public` key

## 5. Run it locally (optional, to test first)
```bash
cd inchat-web
npm install
cp .env.local.example .env.local
# paste your Project URL and anon key into .env.local
npm run dev
```
Open http://localhost:3000 — register a real account, log out, search for it.

## 6. Push to GitHub
```bash
git init
git add .
git commit -m "InChat web app"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR-USERNAME/inchat-web.git
git branch -M main
git push -u origin main
```

## 7. Deploy on Vercel (2 min)
1. Go to https://vercel.com/new and import the GitHub repo you just pushed.
2. Vercel auto-detects Next.js — leave build settings as default.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**. In ~1 minute you'll get a live `https://your-app.vercel.app` URL.

## What's real vs. simulated
- ✅ **Real**: account creation, login, sessions, InChat ID uniqueness, public search,
  "no user found" for a missing ID, adding a contact — all hit actual Postgres rows.
- 🧪 **Simulated (UI only)**: Chats, Nearby (Bluetooth/Wi-Fi Direct only works in a
  native mobile app, never a browser), Cloud storage, Vault. These need real backend
  work (messages table + realtime, file storage bucket, and — for Nearby — the Expo
  app you're already building, since browsers can't do device-to-device Bluetooth).

## Next real backend milestones (in order)
1. `messages` table + Supabase Realtime → live Chats
2. Supabase Storage bucket → InCloud file upload/download
3. Row-level encryption or client-side E2E before storing message content
