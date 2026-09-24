-- InChat — Supabase schema
-- Run this whole file once in Supabase Dashboard → SQL Editor → New query → Run

-- Profiles: one row per user, linked 1:1 to Supabase Auth's auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  inchat_id text unique not null,
  name text not null,
  created_at timestamptz default now()
);

-- Only allow safe id characters, 3-24 chars
alter table public.profiles
  add constraint inchat_id_format check (inchat_id ~ '^[a-z0-9_]{3,24}$');

-- Contacts: who has added whom
create table if not exists public.contacts (
  owner_id uuid references public.profiles(id) on delete cascade,
  contact_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (owner_id, contact_id)
);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;

-- Anyone (including logged-out visitors) can search the public directory —
-- this is what makes "search by InChat ID" work, same as WhatsApp/Telegram ID search.
-- It only exposes name + inchat_id, never email or password.
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

-- You can only create/edit your own profile row
create policy "users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Contacts are private to the owner
create policy "users manage own contacts"
  on public.contacts for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
