-- ============================================================
-- TERSO CONNECT — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- For now, we're using localStorage on the client side.
-- These tables are prepared for future migration to full Supabase persistence.
-- The app currently works with client-side state + Supabase Auth.

-- Enable RLS but with permissive policies for authenticated users
-- (the app handles authorization in the frontend via roles)

-- No tables needed for MVP - the app uses localStorage for data
-- and Supabase Auth for authentication only.

-- This is intentionally minimal. Future phases will add:
-- users, products, requisiciones, facturas, etc.

SELECT 'Terso Connect schema ready — using Supabase Auth only for MVP' as status;
