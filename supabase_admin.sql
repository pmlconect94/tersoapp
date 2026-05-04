-- ============================================================
-- TERSO CONNECT — Crear el primer admin
-- Run AFTER cleanup, en SQL Editor
-- ============================================================
--
-- Inserta UNA fila en employees: tú como admin.
-- Lo demás (otros empleados, proveedores, productos, tareas)
-- lo creas desde la app cuando entres.
--
-- IMPORTANTE: el email debe coincidir EXACTAMENTE con tu usuario
-- en Supabase → Authentication → Users. Si no existe ahí, primero
-- crea el usuario en Auth (Add user → Send invite or Create user).
-- ============================================================

insert into public.employees (id, name, email, role, active, created)
values (
  'u1',
  'Diego Diaz Lizarraga',
  'terso.facturacion@gmail.com',
  'admin',
  true,
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do update set
  name   = excluded.name,
  email  = excluded.email,
  role   = excluded.role,
  active = excluded.active;

-- Verificación
select id, name, email, role, active from public.employees;
