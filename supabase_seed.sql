-- ============================================================
-- TERSO CONNECT — Seed Data
-- Run AFTER supabase_schema.sql, in: SQL Editor → New query
-- ============================================================
--
-- Loads: 11 empleados, 8 proveedores, 37 productos, 42 tareas.
-- Skips: requisiciones/facturas/pagos/audit demo (deberían crearse en uso real).
--
-- Idempotente: ON CONFLICT DO NOTHING. Re-correr no duplica ni borra.
-- Nota: si ya capturaste algo con esos IDs, este script no los sobreescribe.
-- ============================================================

-- Helper: epoch ms from now
-- Postgres: extract(epoch from now()) * 1000

-- ===== EMPLOYEES =====
insert into public.employees (id, name, email, role, active, created) values
  ('u1',  'Diego Ramírez',  'terso.facturacion@gmail.com', 'admin',  true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 30),
  ('u2',  'Ana Sotelo',     'ana@terso.mx',                'piso',   true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 22),
  ('u3',  'Mateo Quintero', 'mateo@terso.mx',              'barra',  true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 14),
  ('u4',  'Lucía Vargas',   'lucia@terso.mx',              'cocina', true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 9),
  ('u5',  'Aldo Mendoza',   'aldo@terso.mx',               'cocina', true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 60),
  ('u6',  'Ramses Ortiz',   'ramses@terso.mx',             'cocina', true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 55),
  ('u7',  'Oscar Beltrán',  'oscar@terso.mx',              'barra',  true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 50),
  ('u8',  'Conrado Salinas','conrado@terso.mx',            'piso',   true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 45),
  ('u9',  'Miros Chávez',   'miros@terso.mx',              'piso',   true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 40),
  ('u10', 'Ismael Téllez',  'ismael@terso.mx',             'piso',   true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 35),
  ('u11', 'Jessica Pérez',  'jessica@terso.mx',            'cocina', true, (extract(epoch from now()) * 1000)::bigint - 86400000 * 28)
on conflict (id) do nothing;

-- ===== SUPPLIERS =====
insert into public.suppliers (id, name, rfc, contact, phone, email, dias_credito, category, notas) values
  ('p1', 'Casa Mezcal Oaxaca',       'CMO180523AB7', 'Juan Pérez',      '55 2345 6789', 'juan@mezcaloaxaca.mx',     15, 'Mezcal',    'Pedido mínimo 6 botellas'),
  ('p2', 'Vinos Boutique MX',        'VBM150812K20', 'Carla Mendoza',   '55 9988 1122', 'ventas@vinosboutique.mx',  30, 'Vinos',     ''),
  ('p3', 'La Carnicería del Centro', 'LCC120304TY5', 'Roberto Díaz',    '55 4455 6677', 'pedidos@lacarniceria.mx',   7, 'Carnes',    'Entrega martes y viernes'),
  ('p4', 'Mercado de la Merced',     null,           'María López',     '55 1234 5566', '',                          0, 'Verduras',  'Pago contado'),
  ('p5', 'Mariscos del Pacífico',    'MDP190215QW3', 'Sergio Romero',   '55 7766 5544', 'sergio@mariscospac.mx',    14, 'Mariscos',  ''),
  ('p6', 'Suministros Hosteleros',   'SUH101005MN8', 'Patricia Sosa',   '55 8899 1010', 'ventas@hosteleros.mx',     30, 'Limpieza',  ''),
  ('p7', 'Panadería La Espiga',      'PLE160708OP4', 'Ricardo Aguilar', '55 2233 4455', 'ricardo@laespiga.mx',       0, 'Panadería', 'Entrega diaria 9 AM'),
  ('p8', 'Lácteos Premium',          'LPR140918RT9', 'Mónica Vázquez',  '55 6677 8899', 'monica@lacteospremium.mx', 21, 'Lácteos',   '')
on conflict (id) do nothing;

-- ===== PRODUCTS =====
insert into public.products (id, name, presentacion, proveedor_id, area, min, current) values
  -- Barra
  ('pr1',  'Mezcal Espadín Vago',         'Botella', 'p1', 'barra',     4,    6),
  ('pr2',  'Mezcal Tobalá Real Minero',   'Botella', 'p1', 'barra',     2,    1),
  ('pr3',  'Tequila Fortaleza Blanco',    'Botella', 'p1', 'barra',     3,    4),
  ('pr4',  'Sotol Por Siempre',           'Botella', 'p1', 'barra',     2,    2),
  ('pr5',  'Vino Tinto Casa Madero',      'Botella', 'p2', 'barra',     6,    8),
  ('pr6',  'Vino Blanco Monte Xanic',     'Botella', 'p2', 'barra',     6,    3),
  ('pr7',  'Cerveza Minerva Stout',       'Caja',    'p2', 'barra',     2,    5),
  ('pr8',  'Hielo en cubos',              'Kg',      'p4', 'barra',    30,   45),
  ('pr9',  'Limón persa',                 'Kg',      'p4', 'barra',     5,    4),
  ('pr10', 'Sal de gusano',               'g',       'p1', 'barra',   200,  350),
  ('pr11', 'Naranja para coctel',         'Kg',      'p4', 'barra',     3,    2),
  ('pr12', 'Agua mineral Topo Chico',     'Caja',    'p2', 'barra',     2,    3),
  -- Cocina
  ('pr13', 'Arrachera marinada',          'Kg',      'p3', 'cocina',    8,   12),
  ('pr14', 'Pulpo fresco',                'Kg',      'p5', 'cocina',    4,    2),
  ('pr15', 'Robalo en filete',            'Kg',      'p5', 'cocina',    6,    7),
  ('pr16', 'Camarón U-15',                'Kg',      'p5', 'cocina',    5,    3),
  ('pr17', 'Pollo orgánico',              'Kg',      'p3', 'cocina',   10,   14),
  ('pr18', 'Maíz azul nixtamalizado',     'Kg',      'p4', 'cocina',   15,   22),
  ('pr19', 'Aguacate Hass',               'Kg',      'p4', 'cocina',    8,    5),
  ('pr20', 'Jitomate saladet',            'Kg',      'p4', 'cocina',   10,    8),
  ('pr21', 'Chile poblano',               'Kg',      'p4', 'cocina',    4,    3),
  ('pr22', 'Cebolla blanca',              'Kg',      'p4', 'cocina',   12,   15),
  ('pr23', 'Cilantro',                    'Manojo',  'p4', 'cocina',   20,   12),
  ('pr24', 'Epazote',                     'Manojo',  'p4', 'cocina',   10,    6),
  ('pr25', 'Queso Oaxaca',                'Kg',      'p8', 'cocina',    5,    7),
  ('pr26', 'Crema ácida',                 'Lt',      'p8', 'cocina',    4,    2),
  ('pr27', 'Mantequilla',                 'Kg',      'p8', 'cocina',    3,    4),
  ('pr28', 'Aceite de oliva',             'Lt',      'p7', 'cocina',    6,    3),
  ('pr29', 'Pan campesino',               'Pz',      'p7', 'cocina',   20,   14),
  ('pr30', 'Tortilla artesanal',          'Kg',      'p4', 'cocina',   12,   18),
  -- Piso
  ('pr31', 'Servilletas de tela',         'Pz',      'p6', 'piso',     80,  120),
  ('pr32', 'Velas de cera',               'Pz',      'p6', 'piso',     30,   18),
  ('pr33', 'Limpiavidrios',               'Lt',      'p6', 'piso',      4,    5),
  ('pr34', 'Detergente multiusos',        'Lt',      'p6', 'piso',      6,    3),
  ('pr35', 'Bolsas de basura',            'Paquete', 'p6', 'piso',      4,    2),
  ('pr36', 'Toallas de papel',            'Paquete', 'p6', 'piso',      6,    8),
  ('pr37', 'Flores de temporada',         'Manojo',  'p4', 'piso',      6,    4)
on conflict (id) do nothing;

-- ===== TASKS (catálogo de 42 tareas) =====
insert into public.tasks (id, name, area, shift, freq, roles_allowed) values
  -- Cocina apertura
  ('t01', 'Encender estufa y plancha',        'cocina',    'apertura', 'diaria',  array['cocina']),
  ('t02', 'Verificar temperatura de cámaras', 'cocina',    'apertura', 'diaria',  array['cocina']),
  ('t03', 'Recibir y acomodar mercancía',     'cocina',    'apertura', 'diaria',  array['cocina']),
  ('t04', 'Mise en place estaciones',         'cocina',    'apertura', 'diaria',  array['cocina']),
  -- Cocina durante
  ('t05', 'Trapear cocina (servicio)',        'cocina',    'durante',  'diaria',  array['cocina']),
  ('t06', 'Reabastecer estaciones',           'cocina',    'durante',  'diaria',  array['cocina']),
  -- Cocina cierre
  ('t07', 'Trapear cocina (cierre)',          'cocina',    'cierre',   'diaria',  array['cocina']),
  ('t08', 'Lavar parrilla y plancha',         'cocina',    'cierre',   'diaria',  array['cocina']),
  ('t09', 'Sacar basura cocina',              'cocina',    'cierre',   'diaria',  array['cocina']),
  ('t10', 'Lavar filtros de campana',         'cocina',    'cierre',   'semanal', array['cocina']),
  ('t11', 'Limpiar refrigerador profundo',    'cocina',    'cierre',   'semanal', array['cocina']),
  ('t12', 'Lavar paredes cocina',             'cocina',    'cierre',   'semanal', array['cocina']),
  -- Barra apertura
  ('t13', 'Surtir hielo y vasos',             'barra',     'apertura', 'diaria',  array['barra']),
  ('t14', 'Preparar guarniciones',            'barra',     'apertura', 'diaria',  array['barra']),
  ('t15', 'Verificar inventario destilados',  'barra',     'apertura', 'diaria',  array['barra']),
  -- Barra cierre
  ('t16', 'Lavar barra completa',             'barra',     'cierre',   'diaria',  array['barra']),
  ('t17', 'Trapear barra',                    'barra',     'cierre',   'diaria',  array['barra']),
  ('t18', 'Limpiar refri de cervezas',        'barra',     'cierre',   'diaria',  array['barra']),
  ('t19', 'Pulir vasos y copas',              'barra',     'cierre',   'diaria',  array['barra']),
  ('t20', 'Limpiar máquina de hielo',         'barra',     'cierre',   'semanal', array['barra']),
  ('t21', 'Lavar tarja y descalcificar',      'barra',     'cierre',   'semanal', array['barra']),
  -- Salón apertura
  ('t22', 'Montar mesas y servilletas',       'salon',     'apertura', 'diaria',  array['piso']),
  ('t23', 'Pulir cubiertos',                  'salon',     'apertura', 'diaria',  array['piso']),
  ('t24', 'Verificar reservas y plano',       'salon',     'apertura', 'diaria',  array['piso']),
  -- Salón cierre
  ('t25', 'Trapear salón',                    'salon',     'cierre',   'diaria',  array['piso']),
  ('t26', 'Limpiar comedor (mesas y sillas)', 'salon',     'cierre',   'diaria',  array['piso']),
  ('t27', 'Recoger y guardar manteles',       'salon',     'cierre',   'diaria',  array['piso']),
  ('t28', 'Trapear escaleras',                'salon',     'cierre',   'diaria',  array['piso']),
  ('t29', 'Limpiar ventanas y vidrios',       'salon',     'cierre',   'semanal', array['piso']),
  ('t30', 'Aspirar alfombras',                'salon',     'cierre',   'semanal', array['piso']),
  -- Baños
  ('t31', 'Limpiar baños — ligera (servicio)','banos',     'durante',  'diaria',  array['piso']),
  ('t32', 'Lavar baños — profunda (cierre)',  'banos',     'cierre',   'diaria',  array['piso']),
  ('t33', 'Reabastecer papel y jabón',        'banos',     'apertura', 'diaria',  array['piso']),
  ('t34', 'Trapear baños',                    'banos',     'cierre',   'diaria',  array['piso']),
  -- Lavaloza
  ('t35', 'Lavar trastes durante servicio',   'lavaloza',  'durante',  'diaria',  array['cocina']),
  ('t36', 'Trapear área de lavaloza',         'lavaloza',  'cierre',   'diaria',  array['cocina']),
  ('t37', 'Lavar tarjas y rejillas',          'lavaloza',  'cierre',   'diaria',  array['cocina']),
  ('t38', 'Descalcificar lavavajillas',       'lavaloza',  'cierre',   'semanal', array['cocina']),
  -- Generales
  ('t39', 'Sacar basura general',             'generales', 'cierre',   'diaria',  array['piso','barra','cocina']),
  ('t40', 'Apagar luces y cerrar',            'generales', 'cierre',   'diaria',  array['piso','barra','cocina']),
  ('t41', 'Revisar entrada y banqueta',       'generales', 'apertura', 'diaria',  array['piso']),
  ('t42', 'Limpieza profunda almacén',        'generales', 'cierre',   'semanal', array['piso','barra','cocina'])
on conflict (id) do nothing;

-- ============================================================
-- DONE
-- ============================================================
select
  (select count(*) from public.employees) as employees,
  (select count(*) from public.suppliers) as suppliers,
  (select count(*) from public.products) as products,
  (select count(*) from public.tasks) as tasks;
