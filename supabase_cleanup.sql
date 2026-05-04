-- ============================================================
-- TERSO CONNECT — Cleanup tablas duplicadas (español viejas)
-- Run this BEFORE el seed, en SQL Editor
-- ============================================================
--
-- Estas 6 tablas están vacías y duplican las nuevas en inglés:
--   users          → reemplazada por employees
--   proveedores    → reemplazada por suppliers
--   requisiciones  → reemplazada por requisitions
--   facturas       → reemplazada por invoices
--   pagos          → reemplazada por payments
--   task_catalog   → reemplazada por tasks
--
-- Verificado vía API: 0 registros en cada una. Seguras de borrar.
-- ============================================================

drop table if exists public.users cascade;
drop table if exists public.proveedores cascade;
drop table if exists public.requisiciones cascade;
drop table if exists public.facturas cascade;
drop table if exists public.pagos cascade;
drop table if exists public.task_catalog cascade;

select 'Cleanup OK — 6 tablas duplicadas eliminadas' as status;
