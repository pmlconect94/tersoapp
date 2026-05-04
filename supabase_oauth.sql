-- ============================================================
-- TERSO CONNECT — Habilitar rol "pending" para auto-registro OAuth
-- Run en SQL Editor → New query
-- ============================================================
--
-- Cuando un usuario entra por primera vez con Google/Microsoft,
-- la app le crea un registro automático con role='pending'.
-- El admin después le cambia el rol a piso/barra/cocina/admin.
--
-- Idempotente — se puede correr varias veces sin problema.
-- ============================================================

alter table public.employees
  drop constraint if exists employees_role_check;

alter table public.employees
  add constraint employees_role_check
  check (role in ('admin','piso','barra','cocina','pending'));

select 'Rol "pending" habilitado' as status;
