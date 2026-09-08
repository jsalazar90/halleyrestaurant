-- ==============================================================================
-- MIGRACIÓN SQL: MÓDULOS DE FACTURACIÓN, PUNTO DE VENTA (POS) Y OPERACIONES
-- Compatible con: Supabase (PostgreSQL 14+)
-- ==============================================================================

-- 1. ACTUALIZAR TABLA DE FACTURAS DE VENTA
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS detalles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50) DEFAULT 'efectivo';
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS vuelto NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS es_pos BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(50);
ALTER TABLE IF EXISTS facturas_venta ADD COLUMN IF NOT EXISTS cliente_direccion TEXT;

-- 2. ACTUALIZAR TABLA DE SERVICIOS / OPERACIONES
ALTER TABLE IF EXISTS servicios ADD COLUMN IF NOT EXISTS tipo_iva VARCHAR(10) DEFAULT 'G';
ALTER TABLE IF EXISTS servicios ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(6, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS servicios ADD COLUMN IF NOT EXISTS precio_base NUMERIC(18, 2) DEFAULT 0.00;
ALTER TABLE IF EXISTS servicios ADD COLUMN IF NOT EXISTS cuenta_contable_id VARCHAR(64);

-- 3. ÍNDICES DE RENDIMIENTO Y VELOCIDAD
CREATE INDEX IF NOT EXISTS idx_facturas_empresa_fecha ON facturas_venta(empresa_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas_venta(empresa_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_servicios_empresa_codigo ON servicios(empresa_id, codigo);

-- 4. DESHABILITAR POLÍTICAS RESTRICTIVAS RLS (Para permitir operaciones directas frontend)
ALTER TABLE IF EXISTS facturas_venta DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servicios DISABLE ROW LEVEL SECURITY;
