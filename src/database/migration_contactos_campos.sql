-- ==============================================================================
-- MIGRACIÓN SQL: CAMPOS EXTENDIDOS PARA LA TABLA DE CONTACTOS
-- Compatible con: Supabase (PostgreSQL 14+)
-- ==============================================================================
-- Ejecutar este script en el "SQL Editor" de tu panel de Supabase si deseas
-- que campos como la persona de contacto, cargo, indicador de empresa/persona natural
-- y datos de pago se almacenen de forma nativa en la base de datos de Supabase.

ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS persona_contacto VARCHAR(150);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS is_company BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS banco_pago VARCHAR(100);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS pago_movil VARCHAR(50);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS terminal_agente VARCHAR(50);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS codigo_iata VARCHAR(10);
ALTER TABLE IF EXISTS contactos ADD COLUMN IF NOT EXISTS codigo_dos_letras VARCHAR(10);

-- Deshabilitar RLS para acceso directo si aplica
ALTER TABLE IF EXISTS contactos DISABLE ROW LEVEL SECURITY;
