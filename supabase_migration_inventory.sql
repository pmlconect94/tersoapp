-- ============================================================
-- TERSO CONNECT — Migración: tablas de inventario
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- Proyecto: mtfznoeukexplozkgrsz
-- ============================================================
-- Añade dos tablas para el módulo de inventario (sustituyen a IndexedDB):
--   - inventory_conteos   (sesiones de conteo abiertas/cerradas)
--   - inventory_events    (audit log por conteo)
-- También extiende la política RLS existente a estas tablas.
--
-- Idempotente — re-ejecutar es seguro.
-- ============================================================

-- ===== INVENTORY CONTEOS =====================================
create table if not exists public.inventory_conteos (
  id            text primary key,
  fecha         text not null,                                     -- 'YYYY-MM-DD'
  area          text not null,
  status        text not null check (status in ('abierto','cerrado')),
  productos     jsonb not null default '[]'::jsonb,
  creado_ts     bigint not null,
  creado_por    jsonb,                                              -- { id, nombre }
  cerrado_ts    bigint,
  cerrado_por   jsonb,
  reabierto_por jsonb
);
create index if not exists inv_conteos_fecha_area_idx on public.inventory_conteos (fecha, area);
create index if not exists inv_conteos_area_idx       on public.inventory_conteos (area);

-- ===== INVENTORY EVENTS ======================================
create table if not exists public.inventory_events (
  id         text primary key,
  conteo_id  text references public.inventory_conteos(id) on delete cascade,
  ts         bigint not null,
  tipo       text not null,                                          -- 'modificacion' | 'reapertura'
  user_id    text,
  user_name  text,
  motivo     text,
  cambios    jsonb not null default '[]'::jsonb
);
create index if not exists inv_events_conteo_idx on public.inventory_events (conteo_id);

-- ===== RLS ====================================================
do $$
declare t text;
begin
  for t in select unnest(array['inventory_conteos','inventory_events'])
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "auth read"  on public.%I', t);
    execute format('drop policy if exists "auth write" on public.%I', t);
    execute format('create policy "auth read"  on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "auth write" on public.%I for all    using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

select 'Inventory migration ready — 2 tables, RLS enabled' as status;
