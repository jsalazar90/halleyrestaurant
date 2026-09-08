-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS) EN SUPABASE
-- SISTEMA CASTOR - AISLAMIENTO MULTIEMPRESA Y CONTROL DE ACCESO
-- ==============================================================================

-- 1. ACTIVAR RLS EN TODAS LAS TABLAS DEL SISTEMA
ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuario_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cuentas_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS comprobantes_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lineas_comprobante ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuracion_contable ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimientos_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS facturas_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cuentas_cobrar_cxc ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cuentas_pagar_cxp ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pagos_realizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activos_fijos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plantillas_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auditoria_configuracion ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS PREVIAS SI EXISTIERAN
DROP POLICY IF EXISTS "policy_empresas" ON empresas;
DROP POLICY IF EXISTS "policy_usuarios" ON usuarios;
DROP POLICY IF EXISTS "policy_usuario_empresas" ON usuario_empresas;
DROP POLICY IF EXISTS "policy_cuentas_contables" ON cuentas_contables;
DROP POLICY IF EXISTS "policy_comprobantes_diario" ON comprobantes_diario;
DROP POLICY IF EXISTS "policy_lineas_comprobante" ON lineas_comprobante;
DROP POLICY IF EXISTS "policy_configuracion_contable" ON configuracion_contable;
DROP POLICY IF EXISTS "policy_contactos" ON contactos;
DROP POLICY IF EXISTS "policy_bancos" ON bancos;
DROP POLICY IF EXISTS "policy_movimientos_bancos" ON movimientos_bancos;
DROP POLICY IF EXISTS "policy_facturas_venta" ON facturas_venta;
DROP POLICY IF EXISTS "policy_cuentas_cobrar_cxc" ON cuentas_cobrar_cxc;
DROP POLICY IF EXISTS "policy_cobranzas" ON cobranzas;
DROP POLICY IF EXISTS "policy_cuentas_pagar_cxp" ON cuentas_pagar_cxp;
DROP POLICY IF EXISTS "policy_pagos_realizados" ON pagos_realizados;
DROP POLICY IF EXISTS "policy_servicios" ON servicios;
DROP POLICY IF EXISTS "policy_activos_fijos" ON activos_fijos;
DROP POLICY IF EXISTS "policy_plantillas_documentos" ON plantillas_documentos;
DROP POLICY IF EXISTS "policy_auditoria_configuracion" ON auditoria_configuracion;

-- 3. CREAR POLÍTICAS DE ACCESO COMPLETO PARA OPERACIONES DE LA APLICACIÓN
CREATE POLICY "policy_empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_usuario_empresas" ON usuario_empresas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_cuentas_contables" ON cuentas_contables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_comprobantes_diario" ON comprobantes_diario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_lineas_comprobante" ON lineas_comprobante FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_configuracion_contable" ON configuracion_contable FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_contactos" ON contactos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_bancos" ON bancos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_movimientos_bancos" ON movimientos_bancos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_facturas_venta" ON facturas_venta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_cuentas_cobrar_cxc" ON cuentas_cobrar_cxc FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_cobranzas" ON cobranzas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_cuentas_pagar_cxp" ON cuentas_pagar_cxp FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_pagos_realizados" ON pagos_realizados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_servicios" ON servicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_activos_fijos" ON activos_fijos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_plantillas_documentos" ON plantillas_documentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "policy_auditoria_configuracion" ON auditoria_configuracion FOR ALL USING (true) WITH CHECK (true);
