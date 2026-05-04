-- ============================================================
-- TERSO CONNECT — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- Strategy:
--   - IDs are TEXT to match the app's uid() generator ("u1", "tip_xxx", etc.)
--   - Some nested data is stored as JSONB (req items, schedule entries) to
--     keep the app's data shape — we can normalize later if needed
--   - RLS is ON. Authenticated users can read everything; the app keeps
--     authorization in the frontend by role. Tighten later as needed.
--
-- Run this whole script once. Re-runs are safe (idempotent CREATE IF NOT EXISTS).
-- ============================================================

-- ===== 1. EMPLOYEES (users) ===================================
create table if not exists public.employees (
  id           text primary key,                 -- 'u1', 'u2', ...
  auth_user_id uuid references auth.users(id) on delete set null,
  name         text not null,
  email        text unique not null,
  role         text not null check (role in ('admin','piso','barra','cocina')),
  active       boolean not null default true,
  created      bigint
);
create index if not exists employees_email_idx on public.employees (lower(email));

-- ===== 2. SUPPLIERS (proveedores) =============================
create table if not exists public.suppliers (
  id            text primary key,
  name          text not null,
  rfc           text,
  contact       text,
  phone         text,
  email         text,
  dias_credito  int default 0,
  category      text,
  notas         text
);

-- ===== 3. PRODUCTS ============================================
create table if not exists public.products (
  id            text primary key,
  name          text not null,
  presentacion  text,
  proveedor_id  text references public.suppliers(id) on delete set null,
  area          text not null check (area in ('piso','barra','cocina')),
  min           numeric not null default 0,
  current       numeric not null default 0
);

-- ===== 4. REQUISITIONS ========================================
create table if not exists public.requisitions (
  id              text primary key,
  folio           text unique not null,
  area            text not null check (area in ('piso','barra','cocina')),
  user_id         text references public.employees(id) on delete set null,
  status          text not null check (status in ('pendiente','aprobada','rechazada','recibida')),
  created         bigint not null,
  items           jsonb not null default '[]'::jsonb,  -- [{productId, qtySolicitada, qtyAprobada, costoUnit, iva, ieps, recibido}]
  proveedor_id    text references public.suppliers(id) on delete set null,
  observaciones   text,
  motivo_rechazo  text,
  reviewed_by     text references public.employees(id) on delete set null,
  reviewed_at     bigint,
  received_by     text references public.employees(id) on delete set null,
  received_at     bigint,
  factura_id      text                                -- FK added below to avoid circular dep
);
create index if not exists requisitions_status_idx on public.requisitions (status);
create index if not exists requisitions_user_idx on public.requisitions (user_id);

-- ===== 5. INVOICES (facturas / CXP) ===========================
create table if not exists public.invoices (
  id                       text primary key,
  folio                    text not null,
  proveedor_id             text references public.suppliers(id) on delete set null,
  requisicion_id           text references public.requisitions(id) on delete set null,
  fecha_emision            bigint,
  fecha_vencimiento        bigint,
  subtotal                 numeric not null default 0,
  iva                      numeric not null default 0,
  ieps                     numeric not null default 0,
  total                    numeric not null default 0,
  saldo_pendiente          numeric not null default 0,
  status                   text not null check (status in ('pendiente','parcial','pagada','vencida')),
  cuenta_pago_sugerida     text check (cuenta_pago_sugerida in ('efectivo','banorte','amex')),
  observaciones            text,
  created_by               text references public.employees(id) on delete set null,
  created                  bigint not null
);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_proveedor_idx on public.invoices (proveedor_id);

-- Add the requisitions.factura_id FK now that invoices exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'requisitions_factura_fk'
  ) then
    alter table public.requisitions
      add constraint requisitions_factura_fk
      foreign key (factura_id) references public.invoices(id) on delete set null;
  end if;
end $$;

-- ===== 6. PAYMENTS (pagos) ====================================
create table if not exists public.payments (
  id              text primary key,
  factura_id      text references public.invoices(id) on delete cascade,
  fecha           bigint not null,
  monto           numeric not null,
  cuenta_pago     text check (cuenta_pago in ('efectivo','banorte','amex')),
  referencia      text,
  registrado_por  text references public.employees(id) on delete set null
);
create index if not exists payments_factura_idx on public.payments (factura_id);

-- ===== 7. INVENTORY HISTORY ===================================
create table if not exists public.inventory_history (
  id          text primary key,
  ts          bigint not null,
  user_id     text references public.employees(id) on delete set null,
  area        text,
  snapshot    jsonb not null   -- arbitrary shape; whatever the app saves
);
create index if not exists inventory_history_ts_idx on public.inventory_history (ts desc);

-- ===== 8. SCHEDULES (horarios semanales) ======================
create table if not exists public.schedules (
  week          text primary key,                          -- ISO date of the Monday: 'YYYY-MM-DD'
  status        text not null default 'draft' check (status in ('draft','published')),
  entries       jsonb not null default '{}'::jsonb,        -- { 'userId|dayIdx': { type, from, to } }
  published_at  bigint
);

-- ===== 9. TIPS (propinas diarias) =============================
create table if not exists public.tips (
  id        text primary key,
  date      text unique not null,        -- 'YYYY-MM-DD'
  pay_tip   numeric not null default 0,
  cash_tip  numeric not null default 0,
  sale      numeric not null default 0,
  note      text
);
create index if not exists tips_date_idx on public.tips (date desc);

-- ===== 10. TIP PAYMENTS (marcas de depositado) ================
create table if not exists public.tip_payments (
  key   text primary key,            -- 'piso:userId:date' or 'kitchen:userId:weekKey'
  paid  boolean not null default true
);

-- ===== 11. TASKS (catálogo) ===================================
create table if not exists public.tasks (
  id              text primary key,
  name            text not null,
  area            text not null check (area in ('cocina','barra','salon','banos','lavaloza','generales')),
  shift           text not null check (shift in ('apertura','durante','cierre')),
  freq            text not null check (freq in ('diaria','semanal')),
  roles_allowed   text[] not null default '{}'   -- ['cocina','barra','piso']
);

-- ===== 12. TASK TEMPLATE (asignación recurrente) ==============
create table if not exists public.task_template (
  task_id   text not null references public.tasks(id) on delete cascade,
  day_idx   int  not null check (day_idx between 0 and 6),
  user_id   text not null references public.employees(id) on delete cascade,
  primary key (task_id, day_idx)
);

-- ===== 13. TASK OVERRIDES (overrides por fecha) ===============
create table if not exists public.task_overrides (
  task_id   text not null references public.tasks(id) on delete cascade,
  date_iso  text not null,                                  -- 'YYYY-MM-DD'
  user_id   text not null references public.employees(id) on delete cascade,
  primary key (task_id, date_iso)
);
create index if not exists task_overrides_date_idx on public.task_overrides (date_iso);

-- ===== 14. TASK RECORDS (lo que se hizo cada día) =============
create table if not exists public.task_records (
  id              text primary key,
  task_id         text references public.tasks(id) on delete cascade,
  user_id         text references public.employees(id) on delete cascade,
  date_iso        text not null,
  status          text not null check (status in ('pendiente','hecha','aprobada','rechazada')),
  employee_note   text,
  admin_note      text,
  completed_at    bigint,
  audited_at      bigint,
  audited_by      text references public.employees(id) on delete set null,
  unique (task_id, user_id, date_iso)
);
create index if not exists task_records_date_idx on public.task_records (date_iso);
create index if not exists task_records_status_idx on public.task_records (status);

-- ===== 15. AUDIT LOG ==========================================
create table if not exists public.audit_log (
  id        text primary key,
  ts        bigint not null,
  user_id   text references public.employees(id) on delete set null,
  action    text not null
);
create index if not exists audit_log_ts_idx on public.audit_log (ts desc);

-- ===== 16. INVENTORY CONTEOS (sesiones de conteo activas/cerradas) ====
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

-- ===== 17. INVENTORY EVENTS (audit por conteo) ========================
create table if not exists public.inventory_events (
  id         text primary key,
  conteo_id  text references public.inventory_conteos(id) on delete cascade,
  ts         bigint not null,
  tipo       text not null,                                         -- 'modificacion' | 'reapertura'
  user_id    text,
  user_name  text,
  motivo     text,
  cambios    jsonb not null default '[]'::jsonb
);
create index if not exists inv_events_conteo_idx on public.inventory_events (conteo_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Strategy: any authenticated user can read+write. Frontend
-- enforces role-based authorization. Tighten later by checking
-- employees.role for the calling user via a helper function.
-- ============================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'employees','suppliers','products','requisitions','invoices','payments',
      'inventory_history','schedules','tips','tip_payments','tasks',
      'task_template','task_overrides','task_records','audit_log',
      'inventory_conteos','inventory_events'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
    -- drop existing policies (idempotent re-run)
    execute format('drop policy if exists "auth read"  on public.%I', t);
    execute format('drop policy if exists "auth write" on public.%I', t);
    -- recreate
    execute format('create policy "auth read"  on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "auth write" on public.%I for all    using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

-- ============================================================
-- DONE
-- ============================================================
select 'Terso Connect schema ready — 17 tables created with RLS' as status;
