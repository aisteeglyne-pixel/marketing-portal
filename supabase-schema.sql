-- =============================================
-- MARKETING PORTAL — SUPABASE SCHEMA
-- Vykdyu šį SQL Supabase SQL Editor'yje
-- =============================================

-- 1. AGENCIES
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text unique not null,
  logo_url text,
  primary_color text default '#534AB7',
  plan text default 'free' check (plan in ('free', 'pro', 'white_label')),
  created_at timestamptz default now()
);

-- 2. CLIENTS
create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id) on delete cascade,
  company_name text not null,
  logo_url text,
  buffer_token text,
  social_channels text[] default '{}',
  created_at timestamptz default now()
);

-- 3. PROFILES (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'client' check (role in ('agency_admin', 'client')),
  agency_id uuid references agencies(id),
  client_id uuid references clients(id),
  is_active boolean default true,
  created_at timestamptz default now()
);
