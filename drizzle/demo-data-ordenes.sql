-- =============================================================================
-- DATOS DE EJEMPLO — Solicitudes de Servicio (Fase 5) y Órdenes de Trabajo (Fase 6)
-- =============================================================================
-- Requiere haber corrido ANTES, en este orden:
--   1. pnpm db:seed          (tenant, sedes, catálogos estándar, usuario admin)
--   2. drizzle/demo-data.sql (sedes renombradas, ubicaciones, activos, materiales,
--                             almacenes, terceros, oficios — todo lo que este script reutiliza)
--
-- Es idempotente: si ya corrió una vez (detecta la orden de la bomba de
-- riego por su descripción, no por consecutivo), no vuelve a insertar nada.
--
-- Los consecutivos de OT y SS se calculan a partir del valor ACTUAL de la
-- secuencia (tabla `sequences`), no están fijos en el script — así, si ya
-- probaste la app a mano y generaste una OT o SS real antes de correr esto,
-- no hay choque de número con la restricción de unicidad.
--
-- Cómo correrlo: pégalo en el "SQL Editor" del panel de Neon, o:
--   psql "$DATABASE_URL_UNPOOLED" -f drizzle/demo-data-ordenes.sql
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
  v_admin_user uuid;
  v_site1 uuid; v_site2 uuid;
  v_loc_bombas1 uuid; v_loc_invernadero1 uuid; v_loc_poscosecha1 uuid; v_loc_pozo2 uuid;
  v_cc_produccion uuid; v_rc_mantenimiento uuid;
  v_wh1 uuid;
  v_party_repuestos uuid;
  v_trade_mecanico uuid; v_trade_electricista uuid; v_trade_riego uuid;
  v_resp_mecanico uuid; v_resp_electricista uuid; v_resp_riego uuid;
  v_mat_filtro uuid; v_mat_aceite uuid;
  v_asset_bomba uuid; v_asset_caldera uuid; v_asset_cuartofrio uuid; v_asset_fertirriego uuid; v_asset_motobomba uuid; v_asset_fumigadora uuid;
  v_wt_mec uuid; v_wt_elec uuid; v_wt_hidr uuid;
  v_mtype_prev uuid; v_mtype_corr uuid;
  v_causa_desgaste uuid; v_causa_falta_mant uuid;
  v_efecto_fuga uuid; v_efecto_rendimiento uuid;
  v_accion_reemplazo uuid; v_accion_ajuste uuid;
  v_causa_pend_repuesto uuid;
  v_causa_cierre_ok uuid;
  v_sr1 uuid; v_sr2 uuid; v_sr3 uuid; v_sr4 uuid;
  v_ot_plan uuid; v_ot_asig uuid; v_ot_ejec uuid; v_ot_pend uuid; v_ot_ejecutada uuid; v_ot_liq uuid; v_ot_cerrada uuid;
  v_task1 uuid;
  v_ot_seq int; v_ss_seq int; v_anio text;
  v_cons_ot_plan text; v_cons_ot_asig text; v_cons_ot_ejec text; v_cons_ot_pend text; v_cons_ot_ejecutada text; v_cons_ot_liq text; v_cons_ot_cerrada text;
  v_cons_ss2 text; v_cons_ss3 text; v_cons_ss4 text;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE codigo = 'CANANVALLE' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No existe un tenant con codigo = ''CANANVALLE''. Corre pnpm db:seed primero.';
  END IF;

  IF EXISTS (SELECT 1 FROM work_orders WHERE tenant_id = v_tenant_id AND descripcion_problema = 'Mantenimiento preventivo trimestral de la bomba de riego principal.') THEN
    RAISE NOTICE 'Los datos de ejemplo de Solicitudes/Órdenes ya existían — no se insertó nada.';
    RETURN;
  END IF;

  SELECT id INTO v_admin_user FROM users WHERE tenant_id = v_tenant_id ORDER BY created_at ASC LIMIT 1;
  IF v_admin_user IS NULL THEN
    RAISE EXCEPTION 'No hay ningún usuario en el tenant. Corre pnpm db:seed primero.';
  END IF;

  -- Consecutivos calculados desde el valor actual real de la secuencia — nunca
  -- pisan una OT/SS que ya hayas creado probando la app a mano.
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

  -- --- Referencias sembradas por drizzle/demo-data.sql ---
  SELECT id INTO v_site1 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S01';
  SELECT id INTO v_site2 FROM sites WHERE tenant_id = v_tenant_id AND codigo = 'S02';
  SELECT id INTO v_loc_bombas1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-BOMB';
  SELECT id INTO v_loc_invernadero1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-INV1';
  SELECT id INTO v_loc_poscosecha1 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F1-POST';
  SELECT id INTO v_loc_pozo2 FROM locations WHERE tenant_id = v_tenant_id AND codigo = 'F2-POZO';
  SELECT id INTO v_cc_produccion FROM cost_centers WHERE tenant_id = v_tenant_id AND codigo = 'CC-PROD';
  SELECT id INTO v_rc_mantenimiento FROM responsible_centers WHERE tenant_id = v_tenant_id AND codigo = 'RC-MANT';
  SELECT id INTO v_wh1 FROM warehouses WHERE tenant_id = v_tenant_id AND codigo = 'BOD-F1';
  SELECT id INTO v_party_repuestos FROM parties WHERE tenant_id = v_tenant_id AND codigo = 'PROV-REP';
  SELECT id INTO v_trade_mecanico FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-MEC';
  SELECT id INTO v_trade_electricista FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-ELE';
  SELECT id INTO v_trade_riego FROM trades WHERE tenant_id = v_tenant_id AND codigo = 'OF-RIE';
  SELECT id INTO v_mat_filtro FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0001';
  SELECT id INTO v_mat_aceite FROM materials WHERE tenant_id = v_tenant_id AND codigo = 'MAT-0002';
  SELECT id INTO v_asset_bomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0001';
  SELECT id INTO v_asset_caldera FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0002';
  SELECT id INTO v_asset_cuartofrio FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0003';
  SELECT id INTO v_asset_fertirriego FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0005';
  SELECT id INTO v_asset_motobomba FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0006';
  SELECT id INTO v_asset_fumigadora FROM assets WHERE tenant_id = v_tenant_id AND codigo = 'ACT-0007';

  IF v_asset_bomba IS NULL THEN
    RAISE EXCEPTION 'No se encontraron los activos de demo (ACT-0001…). Corre drizzle/demo-data.sql primero.';
  END IF;

  -- --- Catálogos sembrados por pnpm db:seed (Fase 2) ---
  SELECT id INTO v_wt_mec FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'MEC';
  SELECT id INTO v_wt_elec FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'ELEC';
  SELECT id INTO v_wt_hidr FROM work_types WHERE tenant_id = v_tenant_id AND codigo = 'HIDR';
  SELECT id INTO v_mtype_prev FROM maintenance_types WHERE tenant_id = v_tenant_id AND codigo = 'PREV';
  SELECT id INTO v_mtype_corr FROM maintenance_types WHERE tenant_id = v_tenant_id AND codigo = 'CORR';

  -- --- Catálogos propios de Órdenes de Trabajo: no vienen en el seed estándar, se crean aquí ---
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

  -- --- Responsables (técnicos), uno por oficio ya sembrado ---
  INSERT INTO responsibles (id, tenant_id, codigo, nombre, trade_id, disponible, costo_hora, activo) VALUES
    (gen_random_uuid(), v_tenant_id, 'RESP-001', 'Carlos Núñez', v_trade_mecanico, true, 6.50, true),
    (gen_random_uuid(), v_tenant_id, 'RESP-002', 'Diego Ramírez', v_trade_electricista, true, 7.00, true),
    (gen_random_uuid(), v_tenant_id, 'RESP-003', 'Ana Fárez', v_trade_riego, true, 5.50, true)
  ON CONFLICT (tenant_id, codigo) WHERE deleted_at IS NULL DO NOTHING;
  SELECT id INTO v_resp_mecanico FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-001';
  SELECT id INTO v_resp_electricista FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-002';
  SELECT id INTO v_resp_riego FROM responsibles WHERE tenant_id = v_tenant_id AND codigo = 'RESP-003';

  -- ===========================================================================
  -- SOLICITUDES DE SERVICIO (Fase 5)
  -- Nota de demo: todas usan el mismo usuario (el admin sembrado) como
  -- solicitante/responsable porque este script no sabe qué otros usuarios
  -- existen en tu tenant — en un entorno real cada una tendría su propio
  -- solicitante.
  -- ===========================================================================

  v_sr1 := gen_random_uuid();
  INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado)
  VALUES (v_sr1, v_tenant_id, NULL, v_admin_user, now() - interval '1 hour', v_asset_motobomba, v_loc_pozo2, v_site2, v_wt_mec,
    'Ruido extraño al encender la motobomba de pozo. Todavía no lo he reportado formalmente.', 'MEDIA', 'BORRADOR');

  v_sr2 := gen_random_uuid();
  INSERT INTO service_requests (id, tenant_id, consecutivo, solicitante_user_id, fecha, asset_id, location_id, site_id, work_type_id, descripcion, prioridad, estado, fecha_compromiso)
  VALUES (v_sr2, v_tenant_id, v_cons_ss2, v_admin_user, now() - interval '1 day', v_asset_cuartofrio, v_loc_poscosecha1, v_site1, NULL,
    'El cuarto frío de poscosecha no está manteniendo la temperatura. La flor cortada de hoy está en riesgo.', 'ALTA', 'ENVIADA', now() + interval '23 hours');

  -- Esta queda APROBADA a propósito, sin convertir: es la candidata natural para probar
  -- "Convertir en orden de trabajo" en vivo desde /solicitudes/[id].
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

  -- ===========================================================================
  -- ÓRDENES DE TRABAJO (Fase 6) — una por cada estado del kanban + cerrada
  -- ===========================================================================

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

  -- Materiales solicitados y ya "consumidos" en el trabajo, pero SIN liquidar todavía
  -- (kardex_movement_id queda NULL a propósito): al hacer clic en "Liquidar" en la
  -- ficha, el sistema generará el movimiento de kárdex real con el motor de costo
  -- promedio ponderado de la Fase 4.
  INSERT INTO wo_materials (id, work_order_id, material_id, cantidad_solicitada, cantidad_entregada, created_by)
  VALUES
    (gen_random_uuid(), v_ot_ejecutada, v_mat_aceite, 1, 1, v_admin_user),
    (gen_random_uuid(), v_ot_ejecutada, v_mat_filtro, 1, 1, v_admin_user);

  INSERT INTO wo_status_history (id, work_order_id, estado_anterior, estado_nuevo, fecha, created_by)
  VALUES (gen_random_uuid(), v_ot_ejecutada, 'EN_EJECUCION', 'EJECUTADA', now() - interval '1 hour', v_admin_user);

  -- 7. LIQUIDADA — sin materiales (solo mano de obra + un costo de tercero), para no
  -- tocar el kárdex desde SQL crudo: los totales se calculan a mano, coherentes con
  -- las líneas insertadas, tal como haría liquidarOrden() en la aplicación.
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

  -- 8. CERRADA — igual de simple que la anterior, ya con causa de cierre
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

  -- --- Mantiene las secuencias 'OT' y 'SS' en sincronía para que el próximo
  -- documento real no choque de número con los que acabamos de insertar a mano.
  UPDATE sequences SET valor_actual = v_ot_seq, anio = EXTRACT(YEAR FROM now())::int
  WHERE tenant_id = v_tenant_id AND documento = 'OT';
  UPDATE sequences SET valor_actual = v_ss_seq, anio = EXTRACT(YEAR FROM now())::int
  WHERE tenant_id = v_tenant_id AND documento = 'SS';

  RAISE NOTICE 'Datos de ejemplo de Solicitudes y Órdenes de Trabajo cargados correctamente.';
END $$;
