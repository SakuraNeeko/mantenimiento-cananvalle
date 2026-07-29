-- =============================================================================
-- DATOS DE EJEMPLO COMPLETOS — Cananvalle Flowers
-- Cobertura de TODO lo construido hasta la Fase 10 (Combustibles y Tecnovigilancia)
-- =============================================================================
-- Requiere haber corrido ANTES, en este orden:
--   1. pnpm db:seed                    (tenant, sedes, catálogos estándar, usuario admin)
--   2. drizzle/demo-data.sql            (ubicaciones, activos ACT-0001..0007, materiales,
--                                        almacenes, terceros, oficios, un movimiento de kárdex)
--   3. drizzle/demo-data-ordenes.sql    (solicitudes SS-2026-..., responsables RESP-00X,
--                                        causas/efectos/acciones de falla, y varias órdenes de trabajo)
--
-- Este script agrega TODO lo que faltaba: catálogos de Infraestructura sin
-- usar todavía (contratos, medidores, magnitudes, riesgos, características
-- dinámicas, clasificaciones biomédicas, tasas de cambio, operaciones,
-- estados genéricos), relaciones de Activos (medidores, lecturas,
-- características asignadas, traslados, historial de estado, documentos,
-- repuestos de despiece), relaciones de Almacén (referencias de proveedor,
-- lotes, inventario físico), Planes de mantenimiento (Fase 7), Paros (Fase
-- 8), envío a Historia y balance periódico (Fase 9), y Combustibles +
-- Tecnovigilancia (Fase 10) — incluyendo activar ambos módulos opcionales.
--
-- Es idempotente: si ya corrió una vez (detecta el activo 'ACT-0008'), no
-- vuelve a insertar nada.
--
-- Cómo correrlo: pégalo completo en el "SQL Editor" del panel de Neon, o:
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/demo-data-completo.sql
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_user uuid;

  -- Ya sembrados por demo-data.sql / demo-data-ordenes.sql / pnpm db:seed
  v_site1 uuid; v_site3 uuid;
  v_loc_bombas1 uuid; v_loc_invernadero1 uuid; v_loc_invernadero3 uuid; v_loc_poscosecha1 uuid;
  v_cc_produccion uuid; v_rc_mantenimiento uuid;
  v_wh1 uuid;
  v_party_repuestos uuid; v_party_combustibles uuid;
  v_trade_mecanico uuid;
  v_resp_mecanico uuid;
  v_uom_hr uuid;
  v_mat_filtro uuid; v_mat_aceite uuid;
  v_asset_bomba uuid; v_asset_caldera uuid; v_asset_tractor uuid; v_asset_fertirriego uuid; v_asset_motobomba uuid; v_asset_fumigadora uuid;
  v_causa_desgaste uuid; v_efecto_fuga uuid; v_efecto_rendimiento uuid;
  v_currency_usd uuid; v_currency_eur uuid;
  v_ot_planificada uuid; v_ot_asignada uuid; v_ot_cerrada uuid;
  v_mtype_prev uuid; v_wtype_vehiculo uuid;

  -- Nuevos en este script
  v_asset_dea uuid;
  v_meter_horo uuid; v_meter_odo uuid;
  v_assetmeter_bomba uuid; v_assetmeter_tractor uuid; v_assetmeter_motobomba uuid;
  v_char_voltaje uuid; v_char_potencia uuid; v_char_placa uuid; v_char_cilindraje uuid; v_char_clasif_riesgo uuid; v_char_calibracion uuid;
  v_contract1 uuid;
  v_plan1 uuid; v_plan2 uuid; v_trigger1_cal uuid; v_trigger1_cont uuid; v_trigger2_cal uuid;
  v_fuel_diesel uuid; v_fuel_extra uuid;
BEGIN
  -- ---------------------------------------------------------------------
  -- 0. Resolución de tenant y guarda de idempotencia
  -- ---------------------------------------------------------------------
  SELECT id INTO v_tenant_id FROM tenants WHERE codigo = 'CANANVALLE' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No existe un tenant con codigo = ''CANANVALLE''. Corre pnpm db:seed primero.';
  END IF;

  IF EXISTS (SELECT 1 FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0008') THEN
    RAISE NOTICE 'Los datos completos de ejemplo ya existían — no se insertó nada.';
    RETURN;
  END IF;

  SELECT id INTO v_admin_user FROM users WHERE tenant_id = v_tenant_id ORDER BY created_at ASC LIMIT 1;
  IF v_admin_user IS NULL THEN
    RAISE EXCEPTION 'No hay ningún usuario en el tenant. Corre pnpm db:seed primero.';
  END IF;

  SELECT id INTO v_site1 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S01';
  SELECT id INTO v_site3 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S03';
  SELECT id INTO v_loc_bombas1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-BOMB';
  SELECT id INTO v_loc_invernadero1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-INV1';
  SELECT id INTO v_loc_invernadero3 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F3-INV1';
  SELECT id INTO v_loc_poscosecha1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-POST';
  SELECT id INTO v_cc_produccion FROM cost_centers WHERE tenant_id = v_tenant_id AND codigo = 'CC-PROD';
  SELECT id INTO v_rc_mantenimiento FROM responsible_centers WHERE tenant_id = v_tenant_id AND codigo = 'RC-MANT';
  SELECT id INTO v_wh1 FROM warehouses WHERE tenant_id = v_tenant_id AND codigo = 'BOD-F1';
  SELECT id INTO v_party_repuestos FROM parties WHERE tenant_id = v_tenant_id AND codigo = 'PROV-REP';
  SELECT id INTO v_party_combustibles FROM parties WHERE tenant_id = v_tenant_id AND codigo = 'PROV-COMB';
  SELECT id INTO v_trade_mecanico FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-MEC';
  SELECT id INTO v_resp_mecanico FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-001';
  SELECT id INTO v_uom_hr FROM uoms WHERE tenant_id = v_tenant_id AND codigo = 'HR';
  SELECT id INTO v_mat_filtro FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0001';
  SELECT id INTO v_mat_aceite FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0002';
  SELECT id INTO v_asset_bomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0001';
  SELECT id INTO v_asset_caldera FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0002';
  SELECT id INTO v_asset_tractor FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0004';
  SELECT id INTO v_asset_fertirriego FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0005';
  SELECT id INTO v_asset_motobomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0006';
  SELECT id INTO v_asset_fumigadora FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0007';
  SELECT id INTO v_causa_desgaste FROM failure_causes WHERE tenant_id = v_tenant_id AND codigo = 'FC-DESG';
  SELECT id INTO v_efecto_fuga FROM failure_effects WHERE tenant_id = v_tenant_id AND codigo = 'FE-FUGA';
  SELECT id INTO v_efecto_rendimiento FROM failure_effects WHERE tenant_id = v_tenant_id AND codigo = 'FE-REND';
  SELECT id INTO v_currency_usd FROM currencies WHERE tenant_id = v_tenant_id AND codigo = 'USD';
  SELECT id INTO v_currency_eur FROM currencies WHERE tenant_id = v_tenant_id AND codigo = 'EUR';
  SELECT id INTO v_mtype_prev FROM maintenance_types WHERE tenant_id = v_tenant_id AND codigo = 'PREV';
  SELECT id INTO v_wtype_vehiculo FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'MEC';
  -- Se buscan por descripción, no por consecutivo: demo-data-ordenes.sql calcula
  -- sus consecutivos a partir de la secuencia real, así que pueden no ser fijos.
  SELECT id INTO v_ot_planificada FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento preventivo trimestral de la bomba de riego principal.';
  SELECT id INTO v_ot_asignada FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Caldera del Invernadero 1 no enciende — posible falla del termopar.';
  SELECT id INTO v_ot_cerrada FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento de rutina de la fumigadora de mochila motorizada.';

  IF v_asset_bomba IS NULL THEN
    RAISE EXCEPTION 'No se encontraron los activos base (ACT-0001…). Corre drizzle/demo-data.sql primero.';
  END IF;
  IF v_resp_mecanico IS NULL OR v_ot_cerrada IS NULL THEN
    RAISE EXCEPTION 'No se encontraron los responsables/órdenes base. Corre drizzle/demo-data-ordenes.sql primero.';
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
  -- Vincula el contrato de repuestos a la bomba de riego (relación assets.contract_id, sin usar hasta ahora)
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
  -- 2. ACTIVOS — nuevo activo biomédico + relaciones (medidores, lecturas,
  --    características, traslados, historial de estado, documentos, despiece)
  -- ===========================================================================

  v_asset_dea := gen_random_uuid();
  INSERT INTO assets (id, tenant_id, codigo, nombre, clase, criticidad, estado, location_id, cost_center_id, responsible_center_id, fabricante, modelo, anio, descripcion, activo)
  VALUES (v_asset_dea, v_tenant_id, 'ACT-0008', 'Desfibrilador externo automático (DEA)', 'BIOMEDICO', 'B', 'OPERATIVO', v_loc_poscosecha1, v_cc_produccion, v_rc_mantenimiento, 'Philips', 'HeartStart OnSite', 2024, 'Equipo de primeros auxilios para emergencias cardíacas del personal.', true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;

  -- Medidores por activo, con promedio de uso diario (alimenta el disparador CONTADOR de Planes, Fase 7)
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

  -- Características dinámicas asignadas a activos concretos
  INSERT INTO asset_characteristics (asset_id, characteristic_id, valor, updated_by)
  VALUES
    (v_asset_bomba, v_char_voltaje, '220', v_admin_user),
    (v_asset_bomba, v_char_potencia, '15', v_admin_user),
    (v_asset_tractor, v_char_placa, 'ABC-1234', v_admin_user),
    (v_asset_tractor, v_char_cilindraje, '4500', v_admin_user),
    (v_asset_dea, v_char_clasif_riesgo, 'IIb', v_admin_user),
    (v_asset_dea, v_char_calibracion, 'true', v_admin_user)
  ON CONFLICT (asset_id, characteristic_id) DO NOTHING;

  -- Traslado: la fumigadora pasó de Finca 3 a Finca 1
  INSERT INTO asset_transfers (id, tenant_id, asset_id, fecha, location_origen_id, location_destino_id, cost_center_origen_id, cost_center_destino_id, motivo, created_by)
  VALUES (gen_random_uuid(), v_tenant_id, v_asset_fumigadora, now() - interval '20 days', v_loc_invernadero3, v_loc_invernadero1, v_cc_produccion, v_cc_produccion, 'Reasignada temporalmente a Finca 1 por alta demanda de fumigación.', v_admin_user);
  UPDATE assets SET location_id = v_loc_invernadero1 WHERE id = v_asset_fumigadora;

  -- Historial de estado: la caldera estuvo en mantenimiento y volvió a operar
  INSERT INTO asset_status_history (id, tenant_id, asset_id, estado_anterior, estado_nuevo, motivo, fecha, created_by)
  VALUES
    (gen_random_uuid(), v_tenant_id, v_asset_caldera, 'OPERATIVO', 'EN_MANTENIMIENTO', 'Paro no programado: falla de encendido.', now() - interval '3 hours', v_admin_user),
    (gen_random_uuid(), v_tenant_id, v_asset_caldera, 'EN_MANTENIMIENTO', 'OPERATIVO', 'Termopar reemplazado, equipo operando con normalidad.', now() - interval '1 hour', v_admin_user);

  -- Documento técnico (referencia, sin archivo real)
  INSERT INTO asset_documents (id, tenant_id, asset_id, tipo, nombre, blob_url, mime_type, bytes, created_by)
  VALUES (gen_random_uuid(), v_tenant_id, v_asset_bomba, 'MANUAL', 'Manual técnico Pedrollo CPm 650.pdf', 'https://ejemplo.blob.vercel-storage.com/manual-cpm650.pdf', 'application/pdf', 245000, v_admin_user);

  -- Despiece: repuestos habituales de la bomba de riego
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
    v_mat_banda uuid; v_mat_fusible uuid; v_mat_grasa uuid; v_mat_guantes uuid;
  BEGIN
    SELECT id INTO v_mat_banda FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0003';
    SELECT id INTO v_mat_fusible FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0004';
    SELECT id INTO v_mat_grasa FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0005';
    SELECT id INTO v_mat_guantes FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0006';

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

  -- Plan 2: alcance por grupo (todos los vehículos)
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

  -- Trazabilidad: el Plan 1 ya generó la orden de la bomba de riego (ajustamos su origen para reflejarlo)
  UPDATE work_orders SET origen = 'PLAN' WHERE id = v_ot_planificada;
  INSERT INTO plan_generation_log (id, plan_id, trigger_id, asset_id, work_order_id, resultado, fecha_proyectada, detalle, created_by)
  VALUES (gen_random_uuid(), v_plan1, v_trigger1_cal, v_asset_bomba, v_ot_planificada, 'GENERADA', (SELECT fecha_programada FROM work_orders WHERE id = v_ot_planificada), 'Cada 3 meses, calculado desde la fecha base.', v_admin_user);

  -- ===========================================================================
  -- 5. PAROS / AVERÍAS (Fase 8)
  -- ===========================================================================

  -- La caldera ya tenía una OT originada por este mismo paro no programado.
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

  -- Envía la orden cerrada de la fumigadora a historia: snapshot inmutable calculado
  -- a partir de sus propias tablas hijas (igual que hace enviarAHistoria() en la app).
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

  -- Balance del mes en curso, calculado sobre las OT cerradas/en historia del periodo
  INSERT INTO periodic_balance (id, tenant_id, tipo, anio, numero, fecha_inicio, fecha_fin, costo_mano_obra, costo_materiales, costo_terceros, costo_otros, costo_total, ot_cerradas, ot_preventivas, ot_correctivas, cumplimiento_plan, mtbf_horas, mttr_horas, disponibilidad, cumplimiento_sla, desglose, calculado_by)
  SELECT
    gen_random_uuid(), v_tenant_id, 'MES', EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int,
    date_trunc('month', now()), date_trunc('month', now()) + interval '1 month',
    COALESCE(SUM(wo.costo_mano_obra), 0), COALESCE(SUM(wo.costo_materiales), 0), COALESCE(SUM(wo.costo_terceros), 0), COALESCE(SUM(wo.costo_otros), 0), COALESCE(SUM(wo.costo_total), 0),
    COUNT(*), COUNT(*) FILTER (WHERE wo.origen = 'PLAN'), COUNT(*) FILTER (WHERE wo.origen != 'PLAN'),
    NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('nota', 'Balance ilustrativo generado por demo-data-completo.sql; usa /reportes/balance para un cálculo con todos los KPIs.'),
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

  RAISE NOTICE 'Datos de ejemplo completos cargados correctamente: Infraestructura, Activos, Almacén, Planes, Paros, Historia/Balance, Combustibles y Tecnovigilancia.';
END $$;
