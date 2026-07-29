-- =============================================================================
-- DATOS DE EJEMPLO — Cananvalle Flowers
-- =============================================================================
-- Para correr DESPUÉS de `pnpm db:migrate` y `pnpm db:seed` (necesita el
-- tenant, las sedes, los catálogos de Infraestructura y los conceptos de
-- kárdex ya sembrados). Es idempotente: se puede ejecutar varias veces sin
-- duplicar nada (usa ON CONFLICT / actualiza si el código ya existe).
--
-- Cómo correrlo: pégalo completo en el "SQL Editor" del panel de Neon
-- (recomendado, no requiere instalar nada), o con psql:
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/demo-data.sql
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_site1 uuid; v_site2 uuid; v_site3 uuid;
  v_loc_invernadero1 uuid; v_loc_bombas1 uuid; v_loc_poscosecha1 uuid;
  v_loc_invernadero2 uuid; v_loc_pozo2 uuid;
  v_loc_invernadero3 uuid;
  v_cc_produccion uuid; v_cc_poscosecha uuid; v_cc_mantenimiento uuid;
  v_rc_mantenimiento uuid;
  v_trade_mecanico uuid; v_trade_electricista uuid; v_trade_riego uuid;
  v_party_repuestos uuid; v_party_combustibles uuid;
  v_wh1 uuid; v_wh2 uuid; v_wh3 uuid;
  v_uom_un uuid; v_uom_gal uuid; v_uom_kg uuid;
  v_mat_filtro uuid; v_mat_aceite uuid; v_mat_banda uuid; v_mat_fusible uuid; v_mat_grasa uuid; v_mat_guantes uuid;
  v_concept_ent_compra uuid;
  v_mov_id uuid;
BEGIN
  -- Va al tenant CANANVALLE explícitamente — si en tu base hay más de uno
  -- (por ejemplo, un residuo con codigo='EMPRESA' de una prueba anterior),
  -- un simple "el primero que aparezca" puede agarrar el que no es.
  SELECT id INTO v_tenant_id FROM tenants WHERE codigo = 'CANANVALLE' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No existe un tenant con codigo = ''CANANVALLE''. Ajusta este valor al COMPANY_CODE real de tu .env, o corre pnpm db:seed primero.';
  END IF;

  -- --- Sedes: renombra las ya sembradas por pnpm db:seed a los nombres reales ---
  UPDATE sites SET nombre = 'Finca 1 - Cananvalle' WHERE tenant_id = v_tenant_id AND codigo = 'S01';
  UPDATE sites SET nombre = 'Finca 2 - Santa Maria' WHERE tenant_id = v_tenant_id AND codigo = 'S02';
  UPDATE sites SET nombre = 'Finca 3 - San Camilo' WHERE tenant_id = v_tenant_id AND codigo = 'S03';
  SELECT id INTO v_site1 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S01';
  SELECT id INTO v_site2 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S02';
  SELECT id INTO v_site3 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S03';

  -- --- Ubicaciones (Infraestructura) ---
  INSERT INTO locations (id, tenant_id, codigo, nombre, site_id, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'F1-INV1', 'Invernadero 1', v_site1, true),
    (gen_random_uuid(), v_tenant_id, 'F1-BOMB', 'Cuarto de bombas', v_site1, true),
    (gen_random_uuid(), v_tenant_id, 'F1-POST', 'Área de poscosecha', v_site1, true),
    (gen_random_uuid(), v_tenant_id, 'F2-INV1', 'Invernadero 1', v_site2, true),
    (gen_random_uuid(), v_tenant_id, 'F2-POZO', 'Pozo y fertirriego', v_site2, true),
    (gen_random_uuid(), v_tenant_id, 'F3-INV1', 'Invernadero 1', v_site3, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_loc_invernadero1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-INV1';
  SELECT id INTO v_loc_bombas1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-BOMB';
  SELECT id INTO v_loc_poscosecha1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-POST';
  SELECT id INTO v_loc_invernadero2 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F2-INV1';
  SELECT id INTO v_loc_pozo2 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F2-POZO';
  SELECT id INTO v_loc_invernadero3 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F3-INV1';

  -- --- Centros de costo ---
  INSERT INTO cost_centers (id, tenant_id, codigo, nombre, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'CC-PROD', 'Producción', true),
    (gen_random_uuid(), v_tenant_id, 'CC-POST', 'Poscosecha', true),
    (gen_random_uuid(), v_tenant_id, 'CC-MANT', 'Mantenimiento', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_cc_produccion FROM cost_centers WHERE tenant_id = v_tenant_id AND codigo = 'CC-PROD';
  SELECT id INTO v_cc_poscosecha FROM cost_centers WHERE tenant_id = v_tenant_id AND codigo = 'CC-POST';
  SELECT id INTO v_cc_mantenimiento FROM cost_centers WHERE tenant_id = v_tenant_id AND codigo = 'CC-MANT';

  -- --- Centro responsable ---
  INSERT INTO responsible_centers (id, tenant_id, codigo, nombre, activo)
  VALUES (gen_random_uuid(), v_tenant_id, 'RC-MANT', 'Mantenimiento General', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_rc_mantenimiento FROM responsible_centers WHERE tenant_id = v_tenant_id AND codigo = 'RC-MANT';

  -- --- Oficios ---
  INSERT INTO trades (id, tenant_id, codigo, nombre, costo_hora_normal, costo_hora_extra, costo_hora_nocturna, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'OF-MEC', 'Mecánico', 6.50, 9.75, 11.00, true),
    (gen_random_uuid(), v_tenant_id, 'OF-ELE', 'Electricista', 7.00, 10.50, 12.00, true),
    (gen_random_uuid(), v_tenant_id, 'OF-RIE', 'Técnico de riego', 5.50, 8.25, 9.50, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_trade_mecanico FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-MEC';
  SELECT id INTO v_trade_electricista FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-ELE';
  SELECT id INTO v_trade_riego FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-RIE';

  -- --- Terceros (proveedores) ---
  INSERT INTO parties (id, tenant_id, codigo, nombre, tipo, ruc, contacto_nombre, contacto_telefono, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'PROV-REP', 'Repuestos Agrícolas del Valle', 'PROVEEDOR', '1790000001001', 'Juan Pérez', '0991234567', true),
    (gen_random_uuid(), v_tenant_id, 'PROV-COMB', 'Combustibles Ecuador S.A.', 'PROVEEDOR', '1790000002001', 'María Salas', '0997654321', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_party_repuestos FROM parties WHERE tenant_id = v_tenant_id AND codigo = 'PROV-REP';
  SELECT id INTO v_party_combustibles FROM parties WHERE tenant_id = v_tenant_id AND codigo = 'PROV-COMB';

  -- --- Almacenes (uno por finca) ---
  INSERT INTO warehouses (id, tenant_id, codigo, nombre, site_id, permite_negativos, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'BOD-F1', 'Bodega Finca 1', v_site1, false, true),
    (gen_random_uuid(), v_tenant_id, 'BOD-F2', 'Bodega Finca 2', v_site2, false, true),
    (gen_random_uuid(), v_tenant_id, 'BOD-F3', 'Bodega Finca 3', v_site3, false, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_wh1 FROM warehouses WHERE tenant_id = v_tenant_id AND codigo = 'BOD-F1';
  SELECT id INTO v_wh2 FROM warehouses WHERE tenant_id = v_tenant_id AND codigo = 'BOD-F2';
  SELECT id INTO v_wh3 FROM warehouses WHERE tenant_id = v_tenant_id AND codigo = 'BOD-F3';

  -- --- Activos ---
  SELECT id INTO v_uom_gal FROM uoms WHERE tenant_id = v_tenant_id AND codigo = 'GAL';

  INSERT INTO assets (id, tenant_id, codigo, nombre, clase, criticidad, location_id, cost_center_id, responsible_center_id, fabricante, modelo, anio, party_id, descripcion, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'ACT-0001', 'Bomba de riego principal', 'EQUIPO', 'A', v_loc_bombas1, v_cc_produccion, v_rc_mantenimiento, 'Pedrollo', 'CPm 650', 2022, v_party_repuestos, 'Bomba centrífuga que alimenta el sistema de riego del Invernadero 1.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0002', 'Caldera de invernadero', 'EQUIPO', 'A', v_loc_invernadero1, v_cc_produccion, v_rc_mantenimiento, 'Cichelero', 'CB-500', 2021, NULL, 'Calefacción nocturna del Invernadero 1.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0003', 'Cuarto frío poscosecha', 'INFRAESTRUCTURA', 'A', v_loc_poscosecha1, v_cc_poscosecha, v_rc_mantenimiento, 'Friogeneral', 'CF-40T', 2020, NULL, 'Preservación de flor cortada antes del despacho.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0004', 'Tractor agrícola', 'VEHICULO', 'B', v_loc_invernadero2, v_cc_produccion, v_rc_mantenimiento, 'New Holland', 'TT4.65', 2019, NULL, 'Labores de campo en Finca 2.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0005', 'Sistema de fertirriego', 'EQUIPO', 'A', v_loc_pozo2, v_cc_produccion, v_rc_mantenimiento, 'Netafim', 'NetaFert', 2022, v_party_repuestos, 'Dosificación automática de fertilizantes.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0006', 'Motobomba de pozo', 'EQUIPO', 'B', v_loc_invernadero3, v_cc_produccion, v_rc_mantenimiento, 'Franklin Electric', 'FPS-4', 2023, NULL, 'Extracción de agua de pozo profundo.', true),
    (gen_random_uuid(), v_tenant_id, 'ACT-0007', 'Fumigadora de mochila motorizada', 'HERRAMIENTA', 'C', v_loc_invernadero3, v_cc_produccion, v_rc_mantenimiento, 'Stihl', 'SR 430', 2023, v_party_repuestos, 'Aplicación de fitosanitarios.', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  -- --- Materiales ---
  SELECT id INTO v_uom_un FROM uoms WHERE tenant_id = v_tenant_id AND codigo = 'UN';
  SELECT id INTO v_uom_kg FROM uoms WHERE tenant_id = v_tenant_id AND codigo = 'KG';

  INSERT INTO materials (id, tenant_id, codigo, nombre, tipo, uom_id, categoria, critico, maneja_lote, activo)
  VALUES
    (gen_random_uuid(), v_tenant_id, 'MAT-0001', 'Filtro de aceite hidráulico', 'REPUESTO', v_uom_un, 'Bombas', true, false, true),
    (gen_random_uuid(), v_tenant_id, 'MAT-0002', 'Aceite hidráulico ISO 68', 'INSUMO', v_uom_gal, 'Lubricantes', false, true, true),
    (gen_random_uuid(), v_tenant_id, 'MAT-0003', 'Banda transportadora poscosecha', 'REPUESTO', v_uom_un, 'Poscosecha', true, false, true),
    (gen_random_uuid(), v_tenant_id, 'MAT-0004', 'Fusible 30A', 'REPUESTO', v_uom_un, 'Eléctrico', false, false, true),
    (gen_random_uuid(), v_tenant_id, 'MAT-0005', 'Grasa multipropósito', 'INSUMO', v_uom_kg, 'Lubricantes', false, true, true),
    (gen_random_uuid(), v_tenant_id, 'MAT-0006', 'Guantes de nitrilo', 'EPP', v_uom_un, 'Seguridad', false, false, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  SELECT id INTO v_mat_filtro FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0001';
  SELECT id INTO v_mat_aceite FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0002';
  SELECT id INTO v_mat_banda FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0003';
  SELECT id INTO v_mat_fusible FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0004';
  SELECT id INTO v_mat_grasa FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0005';
  SELECT id INTO v_mat_guantes FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0006';

  -- --- Existencias iniciales en Bodega Finca 1 ---
  INSERT INTO warehouse_stock (id, tenant_id, warehouse_id, material_id, cantidad, minimo, maximo, punto_pedido, costo_promedio)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_filtro, 8, 3, 20, 5, 12.50),
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_aceite, 15, 5, 40, 10, 22.00),
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_banda, 2, 1, 5, 2, 145.00),
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_fusible, 30, 10, 100, 20, 0.80),
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_grasa, 6, 2, 15, 4, 9.20),
    (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_guantes, 50, 20, 150, 40, 0.35)
  ON CONFLICT (warehouse_id, material_id) DO NOTHING;

  -- --- Un movimiento de kárdex CONFIRMADO de ejemplo (entrada de filtros), para que el módulo Kárdex no se vea vacío ---
  SELECT id INTO v_concept_ent_compra FROM kardex_concepts WHERE tenant_id = v_tenant_id AND codigo = 'ENT-COMP';

  IF v_concept_ent_compra IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM kardex_movements WHERE tenant_id = v_tenant_id AND consecutivo = 'KX-2026-000001'
  ) THEN
    v_mov_id := gen_random_uuid();
    INSERT INTO kardex_movements (id, tenant_id, consecutivo, fecha, kardex_concept_id, warehouse_id, party_id, documento_soporte, estado, confirmado_at)
    VALUES (v_mov_id, v_tenant_id, 'KX-2026-000001', now(), v_concept_ent_compra, v_wh1, v_party_repuestos, 'Factura demo 001-001-0001', 'CONFIRMADO', now());

    INSERT INTO kardex_movement_lines (id, movement_id, material_id, cantidad, costo_unitario, costo_total, saldo_resultante)
    VALUES (gen_random_uuid(), v_mov_id, v_mat_filtro, 8, 12.50, 100.00, 8);

    -- Mantiene la secuencia 'KX' en sincronía para que el próximo movimiento real no choque de número.
    UPDATE sequences SET valor_actual = GREATEST(valor_actual, 1), anio = EXTRACT(YEAR FROM now())::int
    WHERE tenant_id = v_tenant_id AND documento = 'KX';
  END IF;

  RAISE NOTICE 'Datos de ejemplo cargados correctamente.';
END $$;
