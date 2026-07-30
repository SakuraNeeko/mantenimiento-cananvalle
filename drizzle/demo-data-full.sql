-- =============================================================================
-- DATOS DE EJEMPLO — SCRIPT CONSOLIDADO — Cananvalle Flowers
-- =============================================================================
-- Une en un solo archivo, en un solo DO $$ ... $$, TODO lo que antes vivía en
-- tres scripts separados:
--   1. drizzle/demo-data.sql            (catálogo base: sedes, ubicaciones,
--                                        centros, oficios, terceros, almacenes,
--                                        activos ACT-0001..0007, materiales,
--                                        existencias y un movimiento de kárdex)
--   2. drizzle/demo-data-ordenes.sql    (Fase 5-6: solicitudes de servicio y
--                                        una orden de trabajo por cada estado)
--   3. drizzle/demo-data-completo.sql   (Fase 2-4 relaciones sin usar, Fase 7
--                                        Planes, Fase 8 Paros, Fase 9 Historia
--                                        y balance, Fase 10 Combustibles y
--                                        Tecnovigilancia)
--
-- Requiere ANTES:
--   pnpm db:migrate     (todas las migraciones hasta la 0009 — Fase 10 incluida)
--   pnpm db:seed        (tenant, sedes, 97 permisos, roles, usuario admin,
--                        consecutivos y catálogos fundacionales)
--
-- Es idempotente sección por sección: cada una de las tres partes de abajo
-- detecta si YA corrió (por un código o descripción distintivos, nunca por un
-- consecutivo fijo) y se salta sola sin duplicar nada ni chocar con datos que
-- hayas creado probando la app a mano. Puedes correr este archivo las veces
-- que quieras, en cualquier momento, incluso si ya corriste antes uno, dos o
-- los tres scripts originales por separado — el resultado final es el mismo.
--
-- Los tres scripts originales se mantienen en el repositorio por si prefieres
-- correrlos por separado (por ejemplo, para revisar uno a la vez); este
-- archivo es la forma de hacerlo todo de una sola pasada.
--
-- Cómo correrlo: pégalo completo en el "SQL Editor" del panel de Neon, o:
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/demo-data-full.sql
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_user uuid;

  -- --- Sedes y ubicaciones ---
  v_site1 uuid; v_site2 uuid; v_site3 uuid;
  v_loc_invernadero1 uuid; v_loc_invernadero2 uuid; v_loc_invernadero3 uuid;
  v_loc_bombas1 uuid; v_loc_poscosecha1 uuid; v_loc_pozo2 uuid;

  -- --- Centros y oficios ---
  v_cc_produccion uuid; v_cc_poscosecha uuid; v_cc_mantenimiento uuid;
  v_rc_mantenimiento uuid;
  v_trade_mecanico uuid; v_trade_electricista uuid; v_trade_riego uuid;

  -- --- Terceros y almacenes ---
  v_party_repuestos uuid; v_party_combustibles uuid;
  v_wh1 uuid; v_wh2 uuid; v_wh3 uuid;

  -- --- UOM, materiales, kárdex ---
  v_uom_un uuid; v_uom_gal uuid; v_uom_kg uuid; v_uom_hr uuid;
  v_mat_filtro uuid; v_mat_aceite uuid; v_mat_banda uuid; v_mat_fusible uuid; v_mat_grasa uuid; v_mat_guantes uuid;
  v_concept_ent_compra uuid;
  v_mov_id uuid;

  -- --- Activos ---
  v_asset_bomba uuid; v_asset_caldera uuid; v_asset_cuartofrio uuid; v_asset_tractor uuid;
  v_asset_fertirriego uuid; v_asset_motobomba uuid; v_asset_fumigadora uuid; v_asset_dea uuid;

  -- --- Catálogos de Órdenes de trabajo ---
  v_wt_mec uuid; v_wt_elec uuid; v_wt_hidr uuid;
  v_mtype_prev uuid; v_mtype_corr uuid;
  v_causa_desgaste uuid; v_causa_falta_mant uuid;
  v_efecto_fuga uuid; v_efecto_rendimiento uuid;
  v_accion_reemplazo uuid; v_accion_ajuste uuid;
  v_causa_pend_repuesto uuid;
  v_causa_cierre_ok uuid;
  v_resp_mecanico uuid; v_resp_electricista uuid; v_resp_riego uuid;

  -- --- Solicitudes y Órdenes ---
  v_sr1 uuid; v_sr2 uuid; v_sr3 uuid; v_sr4 uuid;
  v_ot_plan uuid; v_ot_asig uuid; v_ot_ejec uuid; v_ot_pend uuid; v_ot_ejecutada uuid; v_ot_liq uuid; v_ot_cerrada uuid;
  v_task1 uuid;
  v_ot_planificada uuid; v_ot_asignada uuid;

  -- --- Monedas, medidores y características (Fase 2-3) ---
  v_currency_usd uuid; v_currency_eur uuid;
  v_wtype_vehiculo uuid;
  v_meter_horo uuid; v_meter_odo uuid;
  v_assetmeter_bomba uuid; v_assetmeter_tractor uuid; v_assetmeter_motobomba uuid;
  v_char_voltaje uuid; v_char_potencia uuid; v_char_placa uuid; v_char_cilindraje uuid; v_char_clasif_riesgo uuid; v_char_calibracion uuid;
  v_contract1 uuid;

  -- --- Planes de mantenimiento (Fase 7) ---
  v_plan1 uuid; v_plan2 uuid; v_trigger1_cal uuid; v_trigger1_cont uuid; v_trigger2_cal uuid;

  -- --- Combustibles (Fase 10) ---
  v_fuel_diesel uuid; v_fuel_extra uuid;

  -- --- Consecutivos calculados dinámicamente (nunca fijos: evitan choques
  -- con documentos reales que hayas generado probando la app a mano) ---
  v_ot_seq int; v_ss_seq int; v_kx_seq int; v_anio text;
  v_cons_ot_plan text; v_cons_ot_asig text; v_cons_ot_ejec text; v_cons_ot_pend text; v_cons_ot_ejecutada text; v_cons_ot_liq text; v_cons_ot_cerrada text;
  v_cons_ss2 text; v_cons_ss3 text; v_cons_ss4 text;
  v_cons_kx1 text;
BEGIN
  -- ===========================================================================
  -- 0. RESOLUCIÓN COMÚN — tenant y usuario admin
  -- ===========================================================================
  SELECT id INTO v_tenant_id FROM tenants WHERE codigo = 'CANANVALLE' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No existe un tenant con codigo = ''CANANVALLE''. Ajusta este valor al COMPANY_CODE real de tu .env, o corre pnpm db:seed primero.';
  END IF;

  SELECT id INTO v_admin_user FROM users WHERE tenant_id = v_tenant_id ORDER BY created_at ASC LIMIT 1;
  IF v_admin_user IS NULL THEN
    RAISE EXCEPTION 'No hay ningún usuario en el tenant. Corre pnpm db:seed primero.';
  END IF;

  -- ===========================================================================
  -- SECCIÓN A — Catálogo base, activos, materiales y kárdex
  -- (antes drizzle/demo-data.sql — ya es naturalmente idempotente: usa
  -- ON CONFLICT ... DO NOTHING en cada catálogo, así que se puede dejar sin
  -- envolver en ningún guard adicional)
  -- ===========================================================================

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

  -- --- Un movimiento de kárdex CONFIRMADO de ejemplo (entrada de filtros) ---
  -- El consecutivo se calcula desde la secuencia real (igual que las OT/SS de
  -- la Sección B): así nunca choca con un movimiento real que hayas generado
  -- probando la app a mano. El guard usa el documento_soporte como marca
  -- distintiva en vez del consecutivo, por la misma razón.
  SELECT id INTO v_concept_ent_compra FROM kardex_concepts WHERE tenant_id = v_tenant_id AND codigo = 'ENT-COMP';

  IF v_concept_ent_compra IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM kardex_movements WHERE tenant_id = v_tenant_id AND documento_soporte = 'Factura demo 001-001-0001'
  ) THEN
    SELECT valor_actual INTO v_kx_seq FROM sequences WHERE tenant_id = v_tenant_id AND documento = 'KX';
    IF v_kx_seq IS NULL THEN
      RAISE EXCEPTION 'No existe la secuencia KX para este tenant. Corre pnpm db:seed primero.';
    END IF;
    v_kx_seq := v_kx_seq + 1;
    v_cons_kx1 := 'KX-' || to_char(now(), 'YYYY') || '-' || lpad(v_kx_seq::text, 6, '0');

    v_mov_id := gen_random_uuid();
    INSERT INTO kardex_movements (id, tenant_id, consecutivo, fecha, kardex_concept_id, warehouse_id, party_id, documento_soporte, estado, confirmado_at)
    VALUES (v_mov_id, v_tenant_id, v_cons_kx1, now(), v_concept_ent_compra, v_wh1, v_party_repuestos, 'Factura demo 001-001-0001', 'CONFIRMADO', now());

    INSERT INTO kardex_movement_lines (id, movement_id, material_id, cantidad, costo_unitario, costo_total, saldo_resultante)
    VALUES (gen_random_uuid(), v_mov_id, v_mat_filtro, 8, 12.50, 100.00, 8);

    UPDATE sequences SET valor_actual = v_kx_seq, anio = EXTRACT(YEAR FROM now())::int
    WHERE tenant_id = v_tenant_id AND documento = 'KX';
  END IF;

  RAISE NOTICE 'Sección A (catálogo base, activos, materiales, kárdex) lista.';

  -- Resuelve los IDs de los activos para que las secciones B y C los tengan
  -- disponibles, existieran de antes o se acaben de crear arriba.
  SELECT id INTO v_asset_bomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0001';
  SELECT id INTO v_asset_caldera FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0002';
  SELECT id INTO v_asset_cuartofrio FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0003';
  SELECT id INTO v_asset_tractor FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0004';
  SELECT id INTO v_asset_fertirriego FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0005';
  SELECT id INTO v_asset_motobomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0006';
  SELECT id INTO v_asset_fumigadora FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0007';

  IF v_asset_bomba IS NULL THEN
    RAISE EXCEPTION 'No se encontraron los activos base (ACT-0001…) tras la Sección A.';
  END IF;

  -- ===========================================================================
  -- SECCIÓN B — Solicitudes de servicio (Fase 5) y Órdenes de trabajo (Fase 6)
  -- (antes drizzle/demo-data-ordenes.sql)
  -- ===========================================================================

  -- --- Catálogos propios de Órdenes de trabajo: ON CONFLICT-safe, siempre se
  -- sincronizan primero para que sus IDs estén listos para la Sección C aunque
  -- las solicitudes/órdenes de más abajo ya se hubieran insertado antes ---
  INSERT INTO failure_causes (id, tenant_id, codigo, nombre, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'FC-DESG', 'Desgaste normal por uso', true),
    (gen_random_uuid(), v_tenant_id, 'FC-FALTM', 'Falta de mantenimiento preventivo', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_causa_desgaste FROM failure_causes WHERE tenant_id = v_tenant_id AND codigo = 'FC-DESG';
  SELECT id INTO v_causa_falta_mant FROM failure_causes WHERE tenant_id = v_tenant_id AND codigo = 'FC-FALTM';

  INSERT INTO failure_effects (id, tenant_id, codigo, nombre, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'FE-FUGA', 'Fuga de fluido', true),
    (gen_random_uuid(), v_tenant_id, 'FE-REND', 'Rendimiento reducido', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_efecto_fuga FROM failure_effects WHERE tenant_id = v_tenant_id AND codigo = 'FE-FUGA';
  SELECT id INTO v_efecto_rendimiento FROM failure_effects WHERE tenant_id = v_tenant_id AND codigo = 'FE-REND';

  INSERT INTO technical_actions (id, tenant_id, codigo, nombre, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'TA-REEMP', 'Reemplazo de repuesto', true),
    (gen_random_uuid(), v_tenant_id, 'TA-AJUST', 'Ajuste y calibración', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_accion_reemplazo FROM technical_actions WHERE tenant_id = v_tenant_id AND codigo = 'TA-REEMP';
  SELECT id INTO v_accion_ajuste FROM technical_actions WHERE tenant_id = v_tenant_id AND codigo = 'TA-AJUST';

  INSERT INTO wo_pending_causes (id, tenant_id, codigo, nombre, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'WP-REP', 'Esperando repuesto en bodega', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_causa_pend_repuesto FROM wo_pending_causes WHERE tenant_id = v_tenant_id AND codigo = 'WP-REP';

  INSERT INTO wo_closing_causes (id, tenant_id, codigo, nombre, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'WC-OK', 'Reparación completada satisfactoriamente', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_causa_cierre_ok FROM wo_closing_causes WHERE tenant_id = v_tenant_id AND codigo = 'WC-OK';

  INSERT INTO responsibles (id, tenant_id, codigo, nombre, trade_id, disponible, costo_hora, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'RESP-001', 'Carlos Núñez', v_trade_mecanico, true, 6.50, true),
    (gen_random_uuid(), v_tenant_id, 'RESP-002', 'Diego Ramírez', v_trade_electricista, true, 7.00, true),
    (gen_random_uuid(), v_tenant_id, 'RESP-003', 'Ana Fárez', v_trade_riego, true, 5.50, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_resp_mecanico FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-001';
  SELECT id INTO v_resp_electricista FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-002';
  SELECT id INTO v_resp_riego FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-003';

  SELECT id INTO v_wt_mec FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'MEC';
  SELECT id INTO v_wt_elec FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'ELEC';
  SELECT id INTO v_wt_hidr FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'HIDR';
  SELECT id INTO v_mtype_prev FROM maintenance_types WHERE tenant_id = v_tenant_id AND codigo = 'PREV';
  SELECT id INTO v_mtype_corr FROM maintenance_types WHERE tenant_id = v_tenant_id AND codigo = 'CORR';

  -- --- El resto de la sección (solicitudes y órdenes) NO es idempotente por
  -- fila (no hay una clave natural para ON CONFLICT), así que se envuelve en
  -- un guard que detecta la orden de la bomba de riego por su descripción ---
  IF NOT EXISTS (
    SELECT 1 FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento preventivo trimestral de la bomba de riego principal.'
  ) THEN

    -- Consecutivos calculados desde el valor actual real de la secuencia —
    -- nunca pisan una OT/SS que ya hayas creado probando la app a mano.
    v_anio := to_char(now(), 'YYYY');
    SELECT valor_actual INTO v_ot_seq FROM sequences WHERE tenant_id = v_tenant_id AND documento = 'OT';
    SELECT valor_actual INTO v_ss_seq FROM sequences WHERE tenant_id = v_tenant_id AND documento = 'SS';
    IF v_ot_seq IS NULL OR v_ss_seq IS NULL THEN
      RAISE EXCEPTION 'No existen las secuencias OT/SS para este tenant. Corre pnpm db:seed primero.';
    END IF;

    v_ot_seq := v_ot_seq + 1; v_cons_ot_plan := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_asig := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_ejec := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_pend := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_ejecutada := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_liq := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');
    v_ot_seq := v_ot_seq + 1; v_cons_ot_cerrada := 'OT-' || v_anio || '-' || lpad(v_ot_seq::text, 6, '0');

    v_ss_seq := v_ss_seq + 1; v_cons_ss2 := 'SS-' || v_anio || '-' || lpad(v_ss_seq::text, 6, '0');
    v_ss_seq := v_ss_seq + 1; v_cons_ss3 := 'SS-' || v_anio || '-' || lpad(v_ss_seq::text, 6, '0');
    v_ss_seq := v_ss_seq + 1; v_cons_ss4 := 'SS-' || v_anio || '-' || lpad(v_ss_seq::text, 6, '0');

    -- =========================================================================
    -- SOLICITUDES DE SERVICIO (Fase 5)
    -- =========================================================================
    v_sr1 := gen_random_uuid();
    INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado)
    VALUES (v_sr1, v_tenant_id, NULL, v_admin_user, now() - interval '1 hour', v_asset_motobomba, v_loc_pozo2, v_site2, v_wt_mec,
      'Ruido extraño al encender la motobomba de pozo. Todavía no lo he reportado formalmente.', 'MEDIA', 'BORRADOR');

    v_sr2 := gen_random_uuid();
    INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado, fecha_compromiso)
    VALUES (v_sr2, v_tenant_id, v_cons_ss2, v_admin_user, now() - interval '1 day', v_asset_cuartofrio, v_loc_poscosecha1, v_site1, NULL,
      'El cuarto frío de poscosecha no está manteniendo la temperatura. La flor cortada de hoy está en riesgo.', 'ALTA', 'ENVIADA', now() + interval '23 hours');

    v_sr3 := gen_random_uuid();
    INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado, fecha_compromiso)
    VALUES (v_sr3, v_tenant_id, v_cons_ss3, v_admin_user, now() - interval '2 days', v_asset_caldera, v_loc_invernadero1, v_site1, v_wt_elec,
      'La caldera del Invernadero 1 no enciende. La temperatura nocturna está bajando y puede afectar el cultivo.', 'URGENTE', 'APROBADA', now() + interval '2 hours');

    v_sr4 := gen_random_uuid();
    INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado, fecha_compromiso, fecha_atencion, solucion_aplicada, es_atencion_directa, calificacion, comentario_calificacion, responsable_user_id)
    VALUES (v_sr4, v_tenant_id, v_cons_ss4, v_admin_user, now() - interval '5 days', NULL, v_loc_bombas1, v_site1, v_wt_elec,
      'Un fusible del tablero del cuarto de bombas se quemó y dejó sin energía a la bomba secundaria.', 'ALTA', 'CERRADA',
      now() - interval '4 days 20 hours', now() - interval '4 days 22 hours', 'Se reemplazó el fusible de 30A quemado. Se verificó que no había cortocircuito antes de reenergizar.', true, 5, 'Atención rápida, quedó funcionando de inmediato.', v_admin_user);

    INSERT INTO service_request_notes (id, service_request_id, mensaje, visible_solicitante, created_by)
    VALUES
      (gen_random_uuid(), v_sr3, 'Se revisó el panel de control: el piloto de encendido está apagado. Podría ser el termopar.', true, v_admin_user),
      (gen_random_uuid(), v_sr4, 'Fusible reemplazado, todo operativo.', true, v_admin_user);

    -- =========================================================================
    -- ÓRDENES DE TRABAJO (Fase 6) — una por cada estado del kanban + cerrada
    -- =========================================================================

    -- 1. BORRADOR — sin consecutivo todavía
    INSERT INTO work_orders (id, tenant_id, origen, asset_id, location_id, cost_center_id, responsible_center_id, prioridad, criticidad, descripcion_problema, estado, causa_falla_id, technical_action_id, created_by)
    VALUES (gen_random_uuid(), v_tenant_id, 'MANUAL', v_asset_motobomba, v_loc_pozo2, v_cc_produccion, v_rc_mantenimiento, 'MEDIA', 'B',
      'Ruido extraño en la motobomba de pozo, a confirmar si requiere intervención.', 'BORRADOR', v_causa_desgaste, NULL, v_admin_user);

    -- 2. PLANIFICADA
    v_ot_plan := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, maintenance_type_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_programada, warehouse_id, created_by)
    VALUES (v_ot_plan, v_tenant_id, v_cons_ot_plan, 'MANUAL', v_asset_bomba, v_loc_bombas1, v_cc_produccion, v_rc_mantenimiento, v_mtype_prev, v_wt_mec, 'MEDIA', 'A',
      'Mantenimiento preventivo trimestral de la bomba de riego principal.', 'PLANIFICADA', now() + interval '3 days', v_wh1, v_admin_user);
    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_plan, 'BORRADOR', 'PLANIFICADA', now() - interval '1 day', v_admin_user);

    -- 3. ASIGNADA
    v_ot_asig := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_programada, warehouse_id, responsable_principal_user_id, causa_falla_id, requiere_paro, created_by)
    VALUES (v_ot_asig, v_tenant_id, v_cons_ot_asig, 'MANUAL', v_asset_caldera, v_loc_invernadero1, v_cc_produccion, v_rc_mantenimiento, v_wt_elec, 'URGENTE', 'A',
      'Caldera del Invernadero 1 no enciende — posible falla del termopar.', 'ASIGNADA', now() + interval '2 hours', v_wh1, v_admin_user, v_causa_desgaste, true, v_admin_user);
    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_asig, 'PLANIFICADA', 'ASIGNADA', now() - interval '3 hours', v_admin_user);

    -- 4. EN_EJECUCION — con checklist parcial, mano de obra y materiales solicitados (sin liquidar)
    v_ot_ejec := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_programada, fecha_inicio_real, warehouse_id, responsable_principal_user_id, causa_falla_id, efecto_falla_id, created_by)
    VALUES (v_ot_ejec, v_tenant_id, v_cons_ot_ejec, 'MANUAL', v_asset_bomba, v_loc_bombas1, v_cc_produccion, v_rc_mantenimiento, v_wt_hidr, 'ALTA', 'A',
      'Fuga de aceite hidráulico visible en la base de la bomba de riego principal.', 'EN_EJECUCION', now() - interval '1 day', now() - interval '2 hours', v_wh1, v_admin_user, v_causa_desgaste, v_efecto_fuga, v_admin_user);

    v_task1 := gen_random_uuid();
    INSERT INTO wo_tasks (id, work_order_id, orden, descripcion, tipo_respuesta, es_critica, resultado, valor_medido, completada_at, completada_by, created_by)
    VALUES (v_task1, v_ot_ejec, 1, 'Verificar nivel de aceite hidráulico', 'NUMERICO', true, NULL, '2.5', now() - interval '1 hour', v_admin_user, v_admin_user);
    INSERT INTO wo_tasks (id, work_order_id, orden, descripcion, tipo_respuesta, es_critica, created_by)
    VALUES (gen_random_uuid(), v_ot_ejec, 2, 'Revisar fugas visibles en mangueras y conexiones', 'OK_NO_OK', false, v_admin_user);

    INSERT INTO wo_labor (id, work_order_id, responsible_id, fecha, horas_normales, costo_calculado, created_by)
    VALUES (gen_random_uuid(), v_ot_ejec, v_resp_mecanico, current_date, 2, 13.00, v_admin_user);

    INSERT INTO wo_materials (id, work_order_id, material_id, cantidad_solicitada, created_by)
    VALUES
      (gen_random_uuid(), v_ot_ejec, v_mat_aceite, 2, v_admin_user),
      (gen_random_uuid(), v_ot_ejec, v_mat_filtro, 1, v_admin_user);

    INSERT INTO wo_comments (id, work_order_id, mensaje, created_by)
    VALUES (gen_random_uuid(), v_ot_ejec, 'Se identificó el origen de la fuga: sello del eje desgastado. Se solicitó el repuesto.', v_admin_user);

    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_ejec, 'ASIGNADA', 'EN_EJECUCION', now() - interval '2 hours', v_admin_user);

    -- 5. PENDIENTE
    v_ot_pend := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, location_id, cost_center_id, responsible_center_id, prioridad, criticidad, descripcion_problema, estado, fecha_inicio_real, warehouse_id, responsable_principal_user_id, causa_pendiente_id, motivo_pendiente, created_by)
    VALUES (v_ot_pend, v_tenant_id, v_cons_ot_pend, 'MANUAL', v_loc_poscosecha1, v_cc_produccion, v_rc_mantenimiento, 'MEDIA', 'B',
      'Revisión de la banda transportadora del área de poscosecha — presenta desalineación.', 'PENDIENTE', now() - interval '2 days', v_wh1, v_admin_user, v_causa_pend_repuesto,
      'Se necesita una banda transportadora nueva; la que había en bodega no coincide con la medida. Se generó la solicitud de compra.', v_admin_user);
    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, motivo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_pend, 'EN_EJECUCION', 'PENDIENTE', 'Esperando repuesto en bodega', now() - interval '1 day', v_admin_user);

    -- 6. EJECUTADA — checklist completo, lista para liquidar en vivo desde la UI
    v_ot_ejecutada := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_inicio_real, fecha_fin_real, warehouse_id, responsable_principal_user_id, causa_falla_id, technical_action_id, firma_ejecutor_user_id, firma_ejecutor_at, created_by)
    VALUES (v_ot_ejecutada, v_tenant_id, v_cons_ot_ejecutada, 'MANUAL', v_asset_motobomba, v_loc_pozo2, v_cc_produccion, v_rc_mantenimiento, v_wt_mec, 'MEDIA', 'B',
      'Cambio de aceite y filtro de la motobomba de pozo (mantenimiento preventivo).', 'EJECUTADA', now() - interval '4 hours', now() - interval '1 hour', v_wh1, v_admin_user, v_causa_desgaste, v_accion_reemplazo, v_admin_user, now() - interval '1 hour', v_admin_user);

    INSERT INTO wo_tasks (id, work_order_id, orden, descripcion, tipo_respuesta, es_critica, resultado, completada_at, completada_by, created_by)
    VALUES
      (gen_random_uuid(), v_ot_ejecutada, 1, 'Drenar aceite usado', 'OK_NO_OK', true, 'OK', now() - interval '2 hours', v_admin_user, v_admin_user),
      (gen_random_uuid(), v_ot_ejecutada, 2, 'Instalar filtro y aceite nuevo', 'OK_NO_OK', true, 'OK', now() - interval '1 hour 30 minutes', v_admin_user, v_admin_user);

    INSERT INTO wo_labor (id, work_order_id, responsible_id, fecha, horas_normales, costo_calculado, created_by)
    VALUES (gen_random_uuid(), v_ot_ejecutada, v_resp_mecanico, current_date, 3, 19.50, v_admin_user);

    INSERT INTO wo_materials (id, work_order_id, material_id, cantidad_solicitada, cantidad_entregada, created_by)
    VALUES
      (gen_random_uuid(), v_ot_ejecutada, v_mat_aceite, 1, 1, v_admin_user),
      (gen_random_uuid(), v_ot_ejecutada, v_mat_filtro, 1, 1, v_admin_user);

    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_ejecutada, 'EN_EJECUCION', 'EJECUTADA', now() - interval '1 hour', v_admin_user);

    -- 7. LIQUIDADA
    v_ot_liq := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_inicio_real, fecha_fin_real, responsable_principal_user_id, party_id, causa_falla_id, efecto_falla_id, technical_action_id, firma_ejecutor_user_id, firma_ejecutor_at, firma_aprobador_user_id, firma_aprobador_at, costo_mano_obra, costo_materiales, costo_terceros, costo_otros, costo_total, liquidada_at, liquidada_by, created_by)
    VALUES (v_ot_liq, v_tenant_id, v_cons_ot_liq, 'MANUAL', v_asset_fertirriego, v_loc_pozo2, v_cc_produccion, v_rc_mantenimiento, v_wt_elec, 'MEDIA', 'A',
      'Inspección eléctrica anual del sistema de fertirriego.', 'LIQUIDADA', now() - interval '3 days', now() - interval '3 days' + interval '4 hours', v_admin_user, v_party_repuestos,
      v_causa_falta_mant, v_efecto_rendimiento, v_accion_ajuste, v_admin_user, now() - interval '3 days' + interval '4 hours', v_admin_user, now() - interval '2 days',
      28.00, 0, 85.00, 0, 113.00, now() - interval '2 days', v_admin_user, v_admin_user);

    INSERT INTO wo_labor (id, work_order_id, responsible_id, fecha, horas_normales, costo_calculado, created_by)
    VALUES (gen_random_uuid(), v_ot_liq, v_resp_electricista, current_date - interval '3 days', 4, 28.00, v_admin_user);

    INSERT INTO wo_third_party_costs (id, work_order_id, party_id, descripcion, monto, created_by)
    VALUES (gen_random_uuid(), v_ot_liq, v_party_repuestos, 'Calibración de sensores de conductividad por proveedor especializado', 85.00, v_admin_user);

    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES (gen_random_uuid(), v_ot_liq, 'EJECUTADA', 'LIQUIDADA', now() - interval '2 days', v_admin_user);

    -- 8. CERRADA
    v_ot_cerrada := gen_random_uuid();
    INSERT INTO work_orders (id, tenant_id, consecutivo, origen, asset_id, location_id, cost_center_id, responsible_center_id, work_type_id, prioridad, criticidad, descripcion_problema, estado, fecha_inicio_real, fecha_fin_real, responsable_principal_user_id, causa_falla_id, technical_action_id, firma_ejecutor_user_id, firma_ejecutor_at, firma_aprobador_user_id, firma_aprobador_at, costo_mano_obra, costo_materiales, costo_terceros, costo_otros, costo_total, liquidada_at, liquidada_by, causa_cierre_id, cerrada_at, cerrada_by, created_by)
    VALUES (v_ot_cerrada, v_tenant_id, v_cons_ot_cerrada, 'MANUAL', v_asset_fumigadora, v_loc_poscosecha1, v_cc_produccion, v_rc_mantenimiento, v_wt_mec, 'BAJA', 'C',
      'Mantenimiento de rutina de la fumigadora de mochila motorizada.', 'CERRADA', now() - interval '6 days', now() - interval '6 days' + interval '1 hour', v_admin_user,
      v_causa_desgaste, v_accion_ajuste, v_admin_user, now() - interval '6 days' + interval '1 hour', v_admin_user, now() - interval '5 days',
      6.50, 0, 0, 0, 6.50, now() - interval '5 days', v_admin_user, v_causa_cierre_ok, now() - interval '4 days', v_admin_user, v_admin_user);

    INSERT INTO wo_labor (id, work_order_id, responsible_id, fecha, horas_normales, costo_calculado, created_by)
    VALUES (gen_random_uuid(), v_ot_cerrada, v_resp_mecanico, current_date - interval '6 days', 1, 6.50, v_admin_user);

    INSERT INTO wo_comments (id, work_order_id, mensaje, created_by)
    VALUES (gen_random_uuid(), v_ot_cerrada, 'Limpieza de boquilla y cambio de correa de arranque. Equipo probado y operativo.', v_admin_user);

    INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
    VALUES
      (gen_random_uuid(), v_ot_cerrada, 'EJECUTADA', 'LIQUIDADA', now() - interval '5 days', v_admin_user),
      (gen_random_uuid(), v_ot_cerrada, 'LIQUIDADA', 'CERRADA', now() - interval '4 days', v_admin_user);

    -- Mantiene las secuencias 'OT' y 'SS' en sincronía.
    UPDATE sequences SET valor_actual = v_ot_seq, anio = EXTRACT(YEAR FROM now())::int
    WHERE tenant_id = v_tenant_id AND documento = 'OT';
    UPDATE sequences SET valor_actual = v_ss_seq, anio = EXTRACT(YEAR FROM now())::int
    WHERE tenant_id = v_tenant_id AND documento = 'SS';

    RAISE NOTICE 'Sección B (Solicitudes y Órdenes de Trabajo) lista.';
  ELSE
    RAISE NOTICE 'Sección B (Solicitudes y Órdenes de Trabajo) ya existía — no se insertó nada.';
  END IF;

  -- Resuelve las tres órdenes de referencia que usa la Sección C, existieran
  -- de antes o se acaben de crear arriba.
  SELECT id INTO v_ot_plan FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento preventivo trimestral de la bomba de riego principal.';
  SELECT id INTO v_ot_asig FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Caldera del Invernadero 1 no enciende — posible falla del termopar.';
  SELECT id INTO v_ot_cerrada FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento de rutina de la fumigadora de mochila motorizada.';

  -- ===========================================================================
  -- SECCIÓN C — Infraestructura extra, Activos, Almacén, Planes (Fase 7),
  -- Paros (Fase 8), Historia/Balance (Fase 9) y Combustibles/Tecnovigilancia
  -- (Fase 10). Antes drizzle/demo-data-completo.sql.
  -- ===========================================================================

  IF NOT EXISTS (SELECT 1 FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0008') THEN

    SELECT id INTO v_uom_hr FROM uoms WHERE tenant_id = v_tenant_id AND codigo = 'HR';
    SELECT id INTO v_currency_usd FROM currencies WHERE tenant_id = v_tenant_id AND codigo = 'USD';
    SELECT id INTO v_currency_eur FROM currencies WHERE tenant_id = v_tenant_id AND codigo = 'EUR';
    v_ot_planificada := v_ot_plan;
    v_ot_asignada := v_ot_asig;
    v_wtype_vehiculo := v_wt_mec;

    IF v_resp_mecanico IS NULL OR v_ot_cerrada IS NULL THEN
      RAISE EXCEPTION 'No se encontraron los responsables/órdenes base de la Sección B.';
    END IF;

    -- ===========================================================================
    -- 1. INFRAESTRUCTURA — catálogos de la Fase 2 que ningún script anterior tocó
    -- ===========================================================================

    INSERT INTO contracts (id, tenant_id, codigo, nombre, party_id, vigencia_inicio, vigencia_fin, monto, alcance, dias_alerta_vencimiento, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'CONT-0001', 'Suministro anual de repuestos', v_party_repuestos, '2026-01-01', '2026-12-31', 25000.00, 'Repuestos de bombas, filtros y lubricantes para las 3 fincas.', 30, true),
      (gen_random_uuid(), v_tenant_id, 'CONT-0002', 'Suministro de combustibles', v_party_combustibles, '2026-01-01', '2027-01-01', 40000.00, 'Diésel y gasolina para vehículos y equipos de las fincas.', 45, true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
    SELECT id INTO v_contract1 FROM contracts WHERE tenant_id = v_tenant_id AND codigo = 'CONT-0001';
    UPDATE assets SET contract_id = v_contract1 WHERE id = v_asset_bomba;

    INSERT INTO meters (id, tenant_id, codigo, nombre, tipo_lectura, uom_id, permite_retroceso, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'HORO', 'Horómetro', 'HOROMETRO', v_uom_hr, false, true),
      (gen_random_uuid(), v_tenant_id, 'ODO', 'Odómetro', 'ODOMETRO', NULL, false, true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
    SELECT id INTO v_meter_horo FROM meters WHERE tenant_id = v_tenant_id AND codigo = 'HORO';
    SELECT id INTO v_meter_odo FROM meters WHERE tenant_id = v_tenant_id AND codigo = 'ODO';

    INSERT INTO magnitudes (id, tenant_id, codigo, nombre, uom_id, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'TEMP', 'Temperatura', NULL, true),
      (gen_random_uuid(), v_tenant_id, 'VIB', 'Vibración', NULL, true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO risks (id, tenant_id, codigo, nombre, probabilidad, impacto, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'RIE-001', 'Falla de bomba de riego en temporada alta', 3, 4, true),
      (gen_random_uuid(), v_tenant_id, 'RIE-002', 'Corte de energía prolongado', 2, 5, true),
      (gen_random_uuid(), v_tenant_id, 'RIE-003', 'Desabastecimiento de repuestos críticos', 2, 3, true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO characteristics (id, tenant_id, codigo, nombre, tipo_dato, opciones, clase_activo, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'CAR-VOLT', 'Voltaje (V)', 'NUMERO', NULL, 'EQUIPO', true),
      (gen_random_uuid(), v_tenant_id, 'CAR-POT', 'Potencia (HP)', 'NUMERO', NULL, 'EQUIPO', true),
      (gen_random_uuid(), v_tenant_id, 'CAR-PLACA', 'Placa', 'TEXTO', NULL, 'VEHICULO', true),
      (gen_random_uuid(), v_tenant_id, 'CAR-CIL', 'Cilindraje (cc)', 'NUMERO', NULL, 'VEHICULO', true),
      (gen_random_uuid(), v_tenant_id, 'CAR-RIESGO', 'Clasificación de riesgo', 'OPCION', '["I", "IIa", "IIb", "III"]'::jsonb, 'BIOMEDICO', true),
      (gen_random_uuid(), v_tenant_id, 'CAR-CALIB', 'Requiere calibración periódica', 'BOOLEANO', NULL, 'BIOMEDICO', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
    SELECT id INTO v_char_voltaje FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-VOLT';
    SELECT id INTO v_char_potencia FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-POT';
    SELECT id INTO v_char_placa FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-PLACA';
    SELECT id INTO v_char_cilindraje FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-CIL';
    SELECT id INTO v_char_clasif_riesgo FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-RIESGO';
    SELECT id INTO v_char_calibracion FROM characteristics WHERE tenant_id = v_tenant_id AND codigo = 'CAR-CALIB';

    INSERT INTO biomedical_characteristics (id, tenant_id, codigo, nombre, riesgo, clase, registro_sanitario, vida_util_meses, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'BIO-DEA', 'Desfibrilador externo automático', 'Riesgo medio-alto', 'IIb', 'ARCSA-DM-2024-00123', 96, true),
      (gen_random_uuid(), v_tenant_id, 'BIO-BOT', 'Botiquín con equipo de primeros auxilios', 'Riesgo bajo', 'I', NULL, 60, true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO currency_rates (id, tenant_id, currency_id, fecha, tasa)
    VALUES
      (gen_random_uuid(), v_tenant_id, v_currency_usd, CURRENT_DATE, 1.000000),
      (gen_random_uuid(), v_tenant_id, v_currency_eur, CURRENT_DATE, 1.080000)
    ON CONFLICT (currency_id, fecha) DO NOTHING;

    INSERT INTO operations (id, tenant_id, codigo, nombre, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'OP-ARR', 'Arranque de equipo', true),
      (gen_random_uuid(), v_tenant_id, 'OP-PAR', 'Parada de equipo', true),
      (gen_random_uuid(), v_tenant_id, 'OP-TURNO', 'Cambio de turno', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO statuses (id, tenant_id, codigo, nombre, activo)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'EST-NUEVO', 'Nuevo', true),
      (gen_random_uuid(), v_tenant_id, 'EST-PROCESO', 'En proceso', true),
      (gen_random_uuid(), v_tenant_id, 'EST-CERRADO', 'Cerrado', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    -- ===========================================================================
    -- 2. ACTIVOS — nuevo activo biomédico + relaciones
    -- ===========================================================================

    v_asset_dea := gen_random_uuid();
    INSERT INTO assets (id, tenant_id, codigo, nombre, clase, criticidad, estado, location_id, cost_center_id, responsible_center_id, fabricante, modelo, anio, descripcion, activo)
    VALUES (v_asset_dea, v_tenant_id, 'ACT-0008', 'Desfibrilador externo automático (DEA)', 'BIOMEDICO', 'B', 'OPERATIVO', v_loc_poscosecha1, v_cc_produccion, v_rc_mantenimiento, 'Philips', 'HeartStart OnSite', 2024, 'Equipo de primeros auxilios para emergencias cardíacas del personal.', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    v_assetmeter_bomba := gen_random_uuid();
    INSERT INTO asset_meters (id, tenant_id, asset_id, meter_id, valor_actual, promedio_uso_diario)
    VALUES (v_assetmeter_bomba, v_tenant_id, v_asset_bomba, v_meter_horo, 1200, 8)
    ON CONFLICT (asset_id, meter_id) WHERE deleted_at IS NULL DO NOTHING;

    v_assetmeter_tractor := gen_random_uuid();
    INSERT INTO asset_meters (id, tenant_id, asset_id, meter_id, valor_actual, promedio_uso_diario)
    VALUES (v_assetmeter_tractor, v_tenant_id, v_asset_tractor, v_meter_odo, 15000, 20)
    ON CONFLICT (asset_id, meter_id) WHERE deleted_at IS NULL DO NOTHING;

    v_assetmeter_motobomba := gen_random_uuid();
    INSERT INTO asset_meters (id, tenant_id, asset_id, meter_id, valor_actual, promedio_uso_diario)
    VALUES (v_assetmeter_motobomba, v_tenant_id, v_asset_motobomba, v_meter_horo, 300, 5)
    ON CONFLICT (asset_id, meter_id) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO meter_readings (id, asset_meter_id, valor, fecha, origen, created_by)
    VALUES
      (gen_random_uuid(), v_assetmeter_bomba, 1150, now() - interval '10 days', 'MANUAL', v_admin_user),
      (gen_random_uuid(), v_assetmeter_bomba, 1200, now() - interval '2 days', 'MANUAL', v_admin_user),
      (gen_random_uuid(), v_assetmeter_tractor, 14800, now() - interval '15 days', 'MANUAL', v_admin_user),
      (gen_random_uuid(), v_assetmeter_tractor, 15000, now() - interval '3 days', 'MANUAL', v_admin_user),
      (gen_random_uuid(), v_assetmeter_motobomba, 280, now() - interval '8 days', 'MANUAL', v_admin_user),
      (gen_random_uuid(), v_assetmeter_motobomba, 300, now() - interval '1 day', 'MANUAL', v_admin_user);

    INSERT INTO asset_characteristics (asset_id, characteristic_id, valor, updated_by)
    VALUES
      (v_asset_bomba, v_char_voltaje, '220', v_admin_user),
      (v_asset_bomba, v_char_potencia, '15', v_admin_user),
      (v_asset_tractor, v_char_placa, 'ABC-1234', v_admin_user),
      (v_asset_tractor, v_char_cilindraje, '4500', v_admin_user),
      (v_asset_dea, v_char_clasif_riesgo, 'IIb', v_admin_user),
      (v_asset_dea, v_char_calibracion, 'true', v_admin_user)
    ON CONFLICT (asset_id, characteristic_id) DO NOTHING;

    INSERT INTO asset_transfers (id, tenant_id, asset_id, fecha, location_origen_id, location_destino_id, cost_center_origen_id, cost_center_destino_id, motivo, created_by)
    VALUES (gen_random_uuid(), v_tenant_id, v_asset_fumigadora, now() - interval '20 days', v_loc_invernadero3, v_loc_invernadero1, v_cc_produccion, v_cc_produccion, 'Reasignada temporalmente a Finca 1 por alta demanda de fumigación.', v_admin_user);
    UPDATE assets SET location_id = v_loc_invernadero1 WHERE id = v_asset_fumigadora;

    INSERT INTO asset_status_history (id, tenant_id, asset_id, estado_anterior, estado_nuevo, motivo, fecha, created_by)
    VALUES
      (gen_random_uuid(), v_tenant_id, v_asset_caldera, 'OPERATIVO', 'EN_MANTENIMIENTO', 'Paro no programado: falla de encendido.', now() - interval '3 hours', v_admin_user),
      (gen_random_uuid(), v_tenant_id, v_asset_caldera, 'EN_MANTENIMIENTO', 'OPERATIVO', 'Termopar reemplazado, equipo operando con normalidad.', now() - interval '1 hour', v_admin_user);

    INSERT INTO asset_documents (id, tenant_id, asset_id, tipo, nombre, blob_url, mime_type, bytes, created_by)
    VALUES (gen_random_uuid(), v_tenant_id, v_asset_bomba, 'MANUAL', 'Manual técnico Pedrollo CPm 650.pdf', 'https://ejemplo.blob.vercel-storage.com/manual-cpm650.pdf', 'application/pdf', 245000, v_admin_user);

    INSERT INTO asset_spare_parts (asset_id, material_id, cantidad, created_by)
    VALUES
      (v_asset_bomba, v_mat_filtro, 1, v_admin_user),
      (v_asset_bomba, v_mat_aceite, 2, v_admin_user)
    ON CONFLICT (asset_id, material_id) DO NOTHING;

    -- ===========================================================================
    -- 3. ALMACÉN — referencias de proveedor, catálogo de repuestos, lotes e inventario físico
    -- ===========================================================================

    INSERT INTO material_references (id, tenant_id, material_id, party_id, fabricante, referencia_fabricante, referencia_proveedor, precio, tiempo_entrega_dias)
    VALUES (gen_random_uuid(), v_tenant_id, v_mat_aceite, v_party_repuestos, 'Shell', 'Tellus S2 M 68', 'REP-ACE-68-20L', 22.00, 5);

    INSERT INTO "references" (id, tenant_id, codigo, nombre, party_id, material_id, codigo_proveedor, activo)
    VALUES (gen_random_uuid(), v_tenant_id, 'REF-0001', 'Filtro de aceite hidráulico — Repuestos del Valle', v_party_repuestos, v_mat_filtro, 'FLT-HID-12', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    INSERT INTO stock_lots (id, tenant_id, warehouse_id, material_id, lote, fecha_vencimiento, cantidad)
    VALUES (gen_random_uuid(), v_tenant_id, v_wh1, v_mat_aceite, 'L2026-001', CURRENT_DATE + interval '18 months', 15)
    ON CONFLICT (warehouse_id, material_id, lote) DO NOTHING;

    -- Inventario físico confirmado, con una pequeña diferencia detectada en fusibles
    DECLARE
      v_inv_id uuid := gen_random_uuid();
    BEGIN
      INSERT INTO physical_inventories (id, tenant_id, warehouse_id, fecha, estado, confirmado_at, confirmado_by, created_by)
      VALUES (v_inv_id, v_tenant_id, v_wh1, now() - interval '5 days', 'CONFIRMADO', now() - interval '5 days', v_admin_user, v_admin_user);

      INSERT INTO physical_inventory_lines (id, inventory_id, material_id, cantidad_sistema, cantidad_contada)
      VALUES
        (gen_random_uuid(), v_inv_id, v_mat_filtro, 8, 8),
        (gen_random_uuid(), v_inv_id, v_mat_aceite, 15, 15),
        (gen_random_uuid(), v_inv_id, v_mat_banda, 2, 2),
        (gen_random_uuid(), v_inv_id, v_mat_fusible, 30, 27),
        (gen_random_uuid(), v_inv_id, v_mat_grasa, 6, 6),
        (gen_random_uuid(), v_inv_id, v_mat_guantes, 50, 48)
      ON CONFLICT (inventory_id, material_id) DO NOTHING;
    END;

    -- ===========================================================================
    -- 4. PLANES DE MANTENIMIENTO (Fase 7)
    -- ===========================================================================

    v_plan1 := gen_random_uuid();
    INSERT INTO maintenance_plans (id, tenant_id, codigo, nombre, maintenance_type_id, work_type_id, alcance, asset_id, responsible_default_id, prioridad, tiempo_estimado_horas, instrucciones, activo)
    VALUES (v_plan1, v_tenant_id, 'PLAN-0001', 'Mantenimiento preventivo trimestral — bomba de riego principal', v_mtype_prev, v_wtype_vehiculo, 'ACTIVO_UNICO', v_asset_bomba, v_resp_mecanico, 'MEDIA', 3, 'Verificar sellos, nivel de aceite y alineación del eje antes de reengrasar.', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    v_trigger1_cal := gen_random_uuid();
    INSERT INTO plan_triggers (id, plan_id, tipo, activo, modo_reprogramacion, dias_anticipacion, intervalo_valor, intervalo_unidad, fecha_base)
    VALUES (v_trigger1_cal, v_plan1, 'CALENDARIO', true, 'FIJO', 5, 3, 'MESES', CURRENT_DATE - interval '2 months');

    v_trigger1_cont := gen_random_uuid();
    INSERT INTO plan_triggers (id, plan_id, tipo, activo, modo_reprogramacion, dias_anticipacion, meter_id, intervalo_contador, umbral_aviso)
    VALUES (v_trigger1_cont, v_plan1, 'CONTADOR', true, 'FLOTANTE', 10, v_meter_horo, 500, 450);

    INSERT INTO plan_tasks (id, plan_id, orden, descripcion, tipo_respuesta, es_critica, trade_id, duracion_minutos)
    VALUES
      (gen_random_uuid(), v_plan1, 1, 'Verificar nivel y estado del aceite hidráulico', 'NUMERICO', true, v_trade_mecanico, 20),
      (gen_random_uuid(), v_plan1, 2, 'Revisar fugas en sellos y mangueras', 'OK_NO_OK', true, v_trade_mecanico, 15),
      (gen_random_uuid(), v_plan1, 3, 'Reengrasar rodamientos', 'OK_NO_OK', false, v_trade_mecanico, 10);

    INSERT INTO plan_resources (id, plan_id, tipo, trade_id, horas_estimadas, costo_estimado)
    VALUES (gen_random_uuid(), v_plan1, 'MANO_OBRA', v_trade_mecanico, 3, 19.50);
    INSERT INTO plan_resources (id, plan_id, tipo, material_id, cantidad_estimada, costo_estimado)
    VALUES
      (gen_random_uuid(), v_plan1, 'MATERIAL', v_mat_aceite, 2, 44.00),
      (gen_random_uuid(), v_plan1, 'MATERIAL', v_mat_filtro, 1, 12.50);

    v_plan2 := gen_random_uuid();
    INSERT INTO maintenance_plans (id, tenant_id, codigo, nombre, maintenance_type_id, work_type_id, alcance, clase_filtro, responsible_default_id, prioridad, tiempo_estimado_horas, instrucciones, activo)
    VALUES (v_plan2, v_tenant_id, 'PLAN-0002', 'Inspección mensual de vehículos y equipos móviles', v_mtype_prev, v_wtype_vehiculo, 'GRUPO', 'VEHICULO', v_resp_mecanico, 'MEDIA', 1, 'Revisión visual de niveles, luces, llantas y frenos.', true)
    ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

    v_trigger2_cal := gen_random_uuid();
    INSERT INTO plan_triggers (id, plan_id, tipo, activo, modo_reprogramacion, dias_anticipacion, intervalo_valor, intervalo_unidad, fecha_base)
    VALUES (v_trigger2_cal, v_plan2, 'CALENDARIO', true, 'FIJO', 3, 1, 'MESES', CURRENT_DATE - interval '20 days');

    INSERT INTO plan_tasks (id, plan_id, orden, descripcion, tipo_respuesta, es_critica, trade_id, duracion_minutos)
    VALUES (gen_random_uuid(), v_plan2, 1, 'Revisión visual de niveles, luces y llantas', 'OK_NO_OK', false, v_trade_mecanico, 30);

    INSERT INTO plan_resources (id, plan_id, tipo, trade_id, horas_estimadas, costo_estimado)
    VALUES (gen_random_uuid(), v_plan2, 'MANO_OBRA', v_trade_mecanico, 1, 6.50);

    UPDATE work_orders SET origen = 'PLAN' WHERE id = v_ot_planificada;
    INSERT INTO plan_generation_log (id, plan_id, trigger_id, asset_id, work_order_id, resultado, fecha_proyectada, detalle, created_by)
    VALUES (gen_random_uuid(), v_plan1, v_trigger1_cal, v_asset_bomba, v_ot_planificada, 'GENERADA', (SELECT fecha_programada FROM work_orders WHERE id = v_ot_planificada), 'Cada 3 meses, calculado desde la fecha base.', v_admin_user);

    -- ===========================================================================
    -- 5. PAROS / AVERÍAS (Fase 8)
    -- ===========================================================================

    UPDATE work_orders SET origen = 'PARO', requiere_paro = true WHERE id = v_ot_asignada;

    INSERT INTO downtimes (id, tenant_id, consecutivo, asset_id, tipo, estado, fecha_inicio, fecha_fin, duracion_minutos, causa_falla_id, efecto_falla_id, impacto_unidades_no_producidas, impacto_costo_estimado, responsable_reporte_user_id, observaciones)
    VALUES
      (gen_random_uuid(), v_tenant_id, 'PA-2026-00001', v_asset_motobomba, 'NO_PROGRAMADO', 'CERRADO', now() - interval '6 days', now() - interval '6 days' + interval '3 hours', 180, v_causa_desgaste, v_efecto_rendimiento, 500, 45.00, v_admin_user, 'Rendimiento reducido por desgaste del impulsor.'),
      (gen_random_uuid(), v_tenant_id, 'PA-2026-00002', v_asset_caldera, 'PROGRAMADO', 'CERRADO', now() - interval '30 days', now() - interval '30 days' + interval '4 hours', 240, NULL, NULL, 0, 0, v_admin_user, 'Parada programada para limpieza anual del quemador.'),
      (gen_random_uuid(), v_tenant_id, 'PA-2026-00003', v_asset_fertirriego, 'NO_PROGRAMADO', 'ABIERTO', now() - interval '2 hours', NULL, NULL, NULL, NULL, NULL, NULL, v_admin_user, 'Sistema detenido por alarma de presión baja, en diagnóstico.');

    INSERT INTO downtimes (id, tenant_id, consecutivo, asset_id, tipo, estado, fecha_inicio, fecha_fin, duracion_minutos, causa_falla_id, efecto_falla_id, work_order_id, responsable_reporte_user_id, observaciones)
    VALUES (gen_random_uuid(), v_tenant_id, 'PA-2026-00004', v_asset_caldera, 'NO_PROGRAMADO', 'CERRADO', now() - interval '1 day', now() - interval '1 day' + interval '2 hours', 120, v_causa_desgaste, v_efecto_fuga, v_ot_asignada, v_admin_user, 'Falla de encendido — se generó la OT correctiva vinculada.');

    UPDATE sequences SET valor_actual = GREATEST(valor_actual, 4), anio = EXTRACT(YEAR FROM now())::int WHERE tenant_id = v_tenant_id AND documento = 'PA';

    -- ===========================================================================
    -- 6. HISTORIA Y BALANCE PERIÓDICO (Fase 9)
    -- ===========================================================================

    INSERT INTO wo_history (
      id, tenant_id, work_order_id, consecutivo, origen, asset_id, asset_codigo, asset_nombre,
      maintenance_type_nombre, cost_center_id, cost_center_nombre, prioridad, criticidad,
      descripcion_problema, causa_falla_nombre, efecto_falla_nombre, causa_cierre_nombre,
      fecha_creacion, fecha_programada, fecha_inicio_real, fecha_fin_real, cerrada_at,
      costo_mano_obra, costo_materiales, costo_terceros, costo_otros, costo_total,
      tiempo_estimado_horas, snapshot, enviada_historia_by
    )
    SELECT
      gen_random_uuid(), wo.tenant_id, wo.id, wo.consecutivo, wo.origen::text, wo.asset_id, a.codigo, a.nombre,
      mt.nombre, wo.cost_center_id, cc.nombre, wo.prioridad::text, wo.criticidad::text,
      wo.descripcion_problema, fc.nombre, fe.nombre, wcc.nombre,
      wo.created_at, wo.fecha_programada, wo.fecha_inicio_real, wo.fecha_fin_real, wo.cerrada_at,
      wo.costo_mano_obra, wo.costo_materiales, wo.costo_terceros, wo.costo_otros, wo.costo_total,
      wo.tiempo_estimado_horas,
      jsonb_build_object(
        'tareas', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'orden', t.orden, 'descripcion', t.descripcion, 'resultado', t.resultado, 'esCritica', t.es_critica)) FROM wo_tasks t WHERE t.work_order_id = wo.id), '[]'::jsonb),
        'manoObra', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'responsableNombre', r.nombre, 'fecha', l.fecha, 'horasNormales', l.horas_normales, 'costoCalculado', l.costo_calculado)) FROM wo_labor l LEFT JOIN responsibles r ON r.id = l.responsible_id WHERE l.work_order_id = wo.id), '[]'::jsonb),
        'materiales', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', m.id, 'materialCodigo', mat.codigo, 'materialNombre', mat.nombre, 'cantidadEntregada', m.cantidad_entregada, 'costoTotal', m.costo_total)) FROM wo_materials m LEFT JOIN materials mat ON mat.id = m.material_id WHERE m.work_order_id = wo.id), '[]'::jsonb),
        'costosTerceros', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', tp.id, 'partyNombre', p.nombre, 'descripcion', tp.descripcion, 'monto', tp.monto)) FROM wo_third_party_costs tp LEFT JOIN parties p ON p.id = tp.party_id WHERE tp.work_order_id = wo.id), '[]'::jsonb),
        'costosOtros', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', oc.id, 'descripcion', oc.descripcion, 'monto', oc.monto)) FROM wo_other_costs oc WHERE oc.work_order_id = wo.id), '[]'::jsonb),
        'comentarios', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'mensaje', c.mensaje, 'autorNombre', u.nombre, 'createdAt', c.created_at)) FROM wo_comments c LEFT JOIN users u ON u.id = c.created_by WHERE c.work_order_id = wo.id), '[]'::jsonb),
        'historialEstados', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', h.id, 'estadoAnterior', h.estado_anterior, 'estadoNuevo', h.estado_nuevo, 'motivo', h.motivo, 'fecha', h.fecha, 'autorNombre', u2.nombre)) FROM wo_status_history h LEFT JOIN users u2 ON u2.id = h.created_by WHERE h.work_order_id = wo.id), '[]'::jsonb)
      ),
      v_admin_user
    FROM work_orders wo
    LEFT JOIN assets a ON a.id = wo.asset_id
    LEFT JOIN maintenance_types mt ON mt.id = wo.maintenance_type_id
    LEFT JOIN cost_centers cc ON cc.id = wo.cost_center_id
    LEFT JOIN failure_causes fc ON fc.id = wo.causa_falla_id
    LEFT JOIN failure_effects fe ON fe.id = wo.efecto_falla_id
    LEFT JOIN wo_closing_causes wcc ON wcc.id = wo.causa_cierre_id
    WHERE wo.id = v_ot_cerrada
    ON CONFLICT (work_order_id) DO NOTHING;

    UPDATE work_orders SET estado = 'EN_HISTORIA' WHERE id = v_ot_cerrada;

    INSERT INTO periodic_balance (id, tenant_id, tipo, anio, numero, fecha_inicio, fecha_fin, costo_mano_obra, costo_materiales, costo_terceros, costo_otros, costo_total, ot_cerradas, ot_preventivas, ot_correctivas, cumplimiento_plan, mtbf_horas, mttr_horas, disponibilidad, cumplimiento_sla, desglose, calculado_by)
    SELECT
      gen_random_uuid(), v_tenant_id, 'MES', EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int,
      date_trunc('month', now()), date_trunc('month', now()) + interval '1 month',
      COALESCE(SUM(wo.costo_mano_obra), 0), COALESCE(SUM(wo.costo_materiales), 0), COALESCE(SUM(wo.costo_terceros), 0), COALESCE(SUM(wo.costo_otros), 0), COALESCE(SUM(wo.costo_total), 0),
      COUNT(*), COUNT(*) FILTER (WHERE wo.origen = 'PLAN'), COUNT(*) FILTER (WHERE wo.origen != 'PLAN'),
      NULL, NULL, NULL, NULL, NULL,
      jsonb_build_object('nota', 'Balance ilustrativo generado por demo-data-full.sql; usa /reportes/balance para un cálculo con todos los KPIs.'),
      v_admin_user
    FROM work_orders wo
    WHERE wo.tenant_id = v_tenant_id AND wo.estado IN ('CERRADA', 'EN_HISTORIA') AND date_trunc('month', wo.cerrada_at) = date_trunc('month', now())
    ON CONFLICT (tenant_id, tipo, anio, numero) DO NOTHING;

    -- ===========================================================================
    -- 7. COMBUSTIBLES Y TECNOVIGILANCIA (Fase 10) — activa ambos módulos opcionales
    -- ===========================================================================

    INSERT INTO tenant_modules (tenant_id, modulo, habilitado)
    VALUES (v_tenant_id, 'combustibles', true), (v_tenant_id, 'tecnovigilancia', true)
    ON CONFLICT (tenant_id, modulo) DO UPDATE SET habilitado = true;

    SELECT id INTO v_fuel_diesel FROM fuels WHERE tenant_id = v_tenant_id AND codigo = 'DIESEL';
    SELECT id INTO v_fuel_extra FROM fuels WHERE tenant_id = v_tenant_id AND codigo = 'EXTRA';

    INSERT INTO fuel_records (id, tenant_id, asset_id, fuel_id, fecha, cantidad, costo_unitario, costo_total, lectura, party_id, conductor_user_id, numero_factura)
    VALUES
      (gen_random_uuid(), v_tenant_id, v_asset_tractor, v_fuel_diesel, now() - interval '30 days', 40, 1.85, 74.00, 14800, v_party_combustibles, v_admin_user, 'FAC-001-4521'),
      (gen_random_uuid(), v_tenant_id, v_asset_tractor, v_fuel_diesel, now() - interval '15 days', 38, 1.85, 70.30, 14950, v_party_combustibles, v_admin_user, 'FAC-001-4602'),
      (gen_random_uuid(), v_tenant_id, v_asset_tractor, v_fuel_diesel, now() - interval '3 days', 42, 1.90, 79.80, 15000, v_party_combustibles, v_admin_user, 'FAC-001-4688'),
      (gen_random_uuid(), v_tenant_id, v_asset_motobomba, v_fuel_extra, now() - interval '8 days', 5, 2.20, 11.00, 280, v_party_combustibles, v_admin_user, 'FAC-001-4550'),
      (gen_random_uuid(), v_tenant_id, v_asset_motobomba, v_fuel_extra, now() - interval '1 day', 5, 2.25, 11.25, 300, v_party_combustibles, v_admin_user, 'FAC-001-4695');

    INSERT INTO adverse_events (id, tenant_id, asset_id, tipo, severidad, clasificacion, fecha, descripcion, estado, causa_raiz, acciones_correctivas, reportado_autoridad, fecha_reporte, numero_reporte, reportante_user_id, cerrada_at, cerrada_by)
    VALUES (
      gen_random_uuid(), v_tenant_id, v_asset_dea, 'EVENTO_ADVERSO', 'MODERADA', 'Falla de funcionamiento — clase IIb',
      now() - interval '25 days', 'El equipo emitió una alerta de batería baja durante una prueba rutinaria de funcionamiento.',
      'CERRADO', 'Batería con más de 4 años de uso, por debajo de su vida útil recomendada.', 'Se reemplazó la batería y se documentó en la hoja de vida del equipo.',
      true, now() - interval '20 days', 'ARCSA-EA-2026-0087', v_admin_user, now() - interval '18 days', v_admin_user
    );

    INSERT INTO adverse_events (id, tenant_id, asset_id, tipo, severidad, clasificacion, fecha, descripcion, estado, reportante_user_id)
    VALUES (
      gen_random_uuid(), v_tenant_id, v_asset_dea, 'ALERTA_FABRICANTE', 'GRAVE', 'Alerta de fabricante — recall preventivo',
      now() - interval '2 days', 'El fabricante notificó un recall preventivo por un lote de electrodos con posible defecto de fabricación.',
      'ABIERTO', v_admin_user
    );

    RAISE NOTICE 'Sección C (Infraestructura, Activos, Almacén, Planes, Paros, Historia/Balance, Combustibles y Tecnovigilancia) lista.';
  ELSE
    RAISE NOTICE 'Sección C ya existía — no se insertó nada.';
  END IF;

  RAISE NOTICE 'Script consolidado completado: Secciones A, B y C verificadas/cargadas.';
END $$;
