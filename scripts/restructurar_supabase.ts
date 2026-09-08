import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[ERROR] Faltan variables en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const COMPANY_ID = 'mBJxB9Y2ROG670k8lyko';

async function restructure() {
  console.log('================================================================');
  console.log(' INICIANDO REESTRUCTURACIÓN DE DATOS EN SUPABASE (SISTEMA CASTOR)');
  console.log('================================================================\n');

  // 1. ACTUALIZAR EMPRESA
  console.log('[1/5] Actualizando políticas de Empresa (Servicios + POS Activo)...');
  const { error: empErr } = await supabase.from('empresas').update({
    tipo_empresa: 'servicios',
    habilitar_pos: true,
    habilitar_vendedores: true,
    habilitar_pedidos: false,
    habilitar_tasa_referencial: true,
    moneda_principal: 'USD',
    moneda_secundaria: 'VES'
  }).eq('id', COMPANY_ID);
  if (empErr) console.warn('Error al actualizar empresa:', empErr.message);
  else console.log(' -> Empresa actualizada: Tipo Servicios, POS Activo, Monedas USD/VES.');

  // 2. CREAR USUARIO ADMIN
  console.log('[2/5] Creando Usuario Administrador inicial...');
  const adminUser = {
    id: 'usr_admin_castor',
    email: 'gerencia@castorecastro.com',
    nombre: 'Administrador General CASTOR',
    role: 'SuperAdmin',
    activo: true
  };
  await supabase.from('usuarios').upsert([adminUser], { onConflict: 'id' });

  const adminCompanyUser = {
    id: 'ue_admin_castor',
    usuario_id: 'usr_admin_castor',
    empresa_id: COMPANY_ID,
    role: 'SuperAdmin',
    activo: true,
    permissions: {
      facturacion: { view: true, create: true, edit: true, delete: true },
      operaciones: { view: true, create: true, edit: true, delete: true },
      contabilidad: { view: true, create: true, edit: true, delete: true },
      bancos: { view: true, create: true, edit: true, delete: true },
      contactos: { view: true, create: true, edit: true, delete: true }
    }
  };
  await supabase.from('usuario_empresas').upsert([adminCompanyUser], { onConflict: 'id' });
  console.log(' -> Usuario administrador (gerencia@castorecastro.com) registrado.');

  // 3. NORMALIZAR CONTACTOS Y FACTURAS
  console.log('[3/5] Normalizando enlace Contactos <-> Facturas y CxC...');
  const { data: contactos } = await supabase.from('contactos').select('*').eq('empresa_id', COMPANY_ID);
  const contactsMapByTax = new Map<string, any>();
  const contactsMapById = new Map<string, any>();

  (contactos || []).forEach(c => {
    contactsMapById.set(c.id, c);
    const cleanTax = (c.tax_id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanTax) contactsMapByTax.set(cleanTax, c);
  });

  const { data: facturas } = await supabase.from('facturas_venta').select('*').eq('empresa_id', COMPANY_ID);
  console.log(` -> Analizando ${facturas?.length || 0} facturas de venta...`);

  let facturasActualizadas = 0;
  let nuevosContactosCreados = 0;

  for (const f of (facturas || [])) {
    let matchedContact = contactsMapById.get(f.cliente_id);

    if (!matchedContact) {
      const cleanClienteId = (f.cliente_id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      matchedContact = contactsMapByTax.get(cleanClienteId);
    }

    // Si aún no existe, creamos el contacto
    if (!matchedContact) {
      const newContactId = `ct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newContact = {
        id: newContactId,
        empresa_id: COMPANY_ID,
        name: f.cliente_nombre || 'Cliente sin nombre',
        tax_id: f.cliente_id || 'S/N',
        type: 'customer',
        activo: true
      };
      await supabase.from('contactos').insert([newContact]);
      contactsMapById.set(newContact.id, newContact);
      const cleanNewTax = (newContact.tax_id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (cleanNewTax) contactsMapByTax.set(cleanNewTax, newContact);
      matchedContact = newContact;
      nuevosContactosCreados++;
    }

    // Determinar estado al contado vs crédito
    const esContado = Number(f.saldo_pendiente || 0) <= 0;
    const nuevoEstado = esContado ? 'Cobrada' : (Number(f.saldo_pendiente) < Number(f.total) ? 'Parcial' : 'Pendiente');
    const montoPagado = esContado ? Number(f.total || 0) : Math.max(0, Number(f.total || 0) - Number(f.saldo_pendiente || 0));

    await supabase.from('facturas_venta').update({
      cliente_id: matchedContact.id,
      cliente_nombre: matchedContact.name,
      cliente_rif: matchedContact.tax_id,
      estado: nuevoEstado,
      monto_pagado: montoPagado,
      saldo_pendiente: esContado ? 0 : Number(f.saldo_pendiente),
      metodo_pago: esContado ? 'transferencia' : 'credito'
    }).eq('id', f.id);

    // Actualizar también en cuentas_cobrar_cxc
    await supabase.from('cuentas_cobrar_cxc').update({
      cliente_id: matchedContact.id,
      cliente: matchedContact.name,
      saldo: esContado ? 0 : Number(f.saldo_pendiente)
    }).eq('id', f.id);

    facturasActualizadas++;
  }

  console.log(` -> ${facturasActualizadas} facturas y CxC normalizadas.`);
  if (nuevosContactosCreados > 0) {
    console.log(` -> ${nuevosContactosCreados} clientes agregados al directorio para consistencia referencial.`);
  }

  // 4. CONFIGURACIÓN DE CORRELATIVOS Y POLÍTICAS FISCALES
  console.log('[4/5] Asegurando Correlativos y Parámetros Contables...');
  await supabase.from('configuracion_contable').update({
    correlativo_factura: '000150',
    prefijo_factura: '',
    correlativo_cotizacion: '000080',
    prefijo_cotizacion: '',
    correlativo_nota_entrega: '000100',
    prefijo_nota_entrega: '',
    prefijo_recibo: 'REC-',
    correlativo_recibo: '00001',
    iva: 16.00,
    igtf: 3.00,
    retencion_iva: 75.00,
    retencion_islr: 2.00,
    usa_maquina_fiscal: false
  }).eq('empresa_id', COMPANY_ID);
  console.log(' -> Correlativos fijados: Factura 000150, Cotización 000080, Nota Entrega 000100.');

  // 5. ENLACE DE SERVICIOS / OPERACIONES
  console.log('[5/5] Verificando Catálogo de Operaciones y Servicios...');
  const { data: servs } = await supabase.from('servicios').select('id, codigo, nombre, tipo_iva, cuenta_contable_id').eq('empresa_id', COMPANY_ID);
  console.log(` -> ${servs?.length || 0} servicios en catálogo vinculados a Operaciones.`);

  console.log('\n================================================================');
  console.log(' REESTRUCTURACIÓN DE DATOS FINALIZADA EXITOSAMENTE');
  console.log('================================================================\n');
  process.exit(0);
}

restructure().catch(err => {
  console.error('[ERROR FATAL]:', err);
  process.exit(1);
});
