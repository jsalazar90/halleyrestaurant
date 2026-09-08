import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[ERROR] Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BACKUP_PATH = 'c:\\Users\\Portal De trabajo\\Downloads\\respaldo-CASTOR_E_CASTRO,_C.A.-2026-09-07.json';

// Helper chunker for bulk inserts
async function chunkedUpsert(tableName: string, rows: any[], chunkSize = 100) {
  if (!rows || rows.length === 0) return 0;
  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.warn(`[WARN] Error insertando en ${tableName} (lote ${i}-${i + chunk.length}):`, error.message);
    } else {
      totalInserted += chunk.length;
    }
  }
  return totalInserted;
}

async function runMigration() {
  console.log('================================================================');
  console.log(' MIGRACIÓN AUTOMÁTICA DE DATOS FIREBASE -> SUPABASE (SISTEMA CASTOR)');
  console.log('================================================================');

  if (!fs.existsSync(BACKUP_PATH)) {
    console.error(`[ERROR] No se encontró el archivo de respaldo en: ${BACKUP_PATH}`);
    process.exit(1);
  }

  console.log(`[1/8] Leyendo archivo de respaldo JSON (${BACKUP_PATH})...`);
  const rawData = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));

  const rawCompany = rawData.companyInfo?.[0] || {
    id: 'mBJxB9Y2ROG670k8lyko',
    nombre: 'CASTOR E CASTRO, C.A.',
    rif: 'J070123087',
    direccion: 'CALLE 77 EDIF TORRE 77 PISO 11 LOCAL 11 SECTOR DELICIAS MARACAIBO ZULIA',
    telefono: '+58 414-6902986',
    email: 'Gerencia@castorecastro.com',
    monedaPrincipal: 'USD',
    monedaSecundaria: 'VES',
    tipoContribuyente: 'especial',
    tipoEmpresa: 'servicios'
  };

  const companyId = rawCompany.id || 'mBJxB9Y2ROG670k8lyko';

  // 1. EMPRESA
  console.log('[2/8] Migrando Empresa principal...');
  const empresaRow = {
    id: companyId,
    nombre: rawCompany.nombre || 'CASTOR E CASTRO, C.A.',
    rif: rawCompany.rif || 'J070123087',
    direccion: rawCompany.direccion || '',
    telefono: rawCompany.telefono || '',
    email: rawCompany.email || '',
    moneda_principal: rawCompany.monedaPrincipal || 'USD',
    moneda_secundaria: rawCompany.monedaSecundaria || 'VES',
    tipo_contribuyente: rawCompany.tipoContribuyente || 'especial',
    tipo_empresa: rawCompany.tipoEmpresa || 'servicios',
    habilitar_pos: true,
    habilitar_vendedores: rawCompany.habilitarVendedores ?? true,
    habilitar_pedidos: rawCompany.habilitarPedidos ?? true
  };
  await supabase.from('empresas').upsert([empresaRow], { onConflict: 'id' });
  console.log(` -> Empresa "${empresaRow.nombre}" migrada con éxito.`);

  // 2. CUENTAS CONTABLES
  console.log('[3/8] Migrando Plan de Cuentas NIIF...');
  const seenCodes = new Set<string>();
  const cuentas = (rawData['accounting-accounts'] || []).map((c: any) => {
    let code = (c.codigo || '').trim();
    if (!code) code = `ACC-${c.id}`;
    if (seenCodes.has(code)) {
      code = `${code}.1`;
    }
    seenCodes.add(code);

    return {
      id: c.id,
      empresa_id: companyId,
      codigo: code,
      nombre: c.nombre || '',
      tipo: c.tipo || 'Movimiento',
      naturaleza: c.naturaleza || 'Deudora',
      grupo: c.grupo || 'Activo',
      nivel: code ? code.split('.').length : 1,
      saldo_actual: Number(c.saldoActual || c.saldo || 0),
      activo: true
    };
  });
  const cuentasCount = await chunkedUpsert('cuentas_contables', cuentas);
  console.log(` -> ${cuentasCount} de ${cuentas.length} cuentas contables migradas.`);

  // 3. CONFIGURACIÓN CONTABLE & FISCAL
  console.log('[4/8] Migrando Configuración Contable, Correlativos y Alícuotas...');
  const rawCfg = rawData['accounting-config']?.[0] || {};
  const configRow = {
    id: rawCfg.id || `cfg_${companyId}`,
    empresa_id: companyId,
    cuenta_inventario: rawCfg.cuentaInventario || null,
    cuenta_costo_ventas: rawCfg.cuentaCostoVentas || null,
    cuenta_ventas: rawCfg.cuentaVentas || rawCfg.cuentaDefaultIngresos || '41',
    cuenta_gastos: rawCfg.cuentaGastos || rawCfg.cuentaDefaultGastos || '51',
    cuenta_anticipo_recibido: rawCfg.cuentaAnticipoRecibido || null,
    cuenta_anticipo_otorgado: rawCfg.cuentaAnticipoOtorgado || null,
    cuenta_cxc: rawCfg.cuentaCxc || '11',
    cuenta_cxp: rawCfg.cuentaCxp || '21',
    cuenta_debito_fiscal: rawCfg.cuentaDebitoFiscal || '22',
    cuenta_credito_fiscal: rawCfg.cuentaCreditoFiscal || null,
    cuenta_iva_retenido_ventas: rawCfg.cuentaIvaRetenidoVentas || null,
    cuenta_iva_retenido_compras: rawCfg.cuentaIvaRetenidoCompras || null,
    cuenta_islr_retenido_ventas: rawCfg.cuentaIslrRetenidoVentas || null,
    cuenta_islr_retenido_compras: rawCfg.cuentaIslrRetenidoCompras || null,
    cuenta_ganancia_diferencial: rawCfg.cuentaGananciaDiferencialCambiario || '4.1.1',
    cuenta_perdida_diferencial: rawCfg.cuentaPerdidaDiferencialCambiario || '5.2.1',
    iva: Number(rawCfg.iva || 16),
    igtf: Number(rawCfg.igtf || 3),
    retencion_iva: Number(rawCfg.retencionIva || 75),
    retencion_islr: Number(rawCfg.retencionIslr || 2),
    prefijo_factura: rawCfg.prefijoFactura || '',
    correlativo_factura: rawCfg.correlativoFactura || '000150',
    prefijo_cotizacion: rawCfg.prefijoCotizacion || '',
    correlativo_cotizacion: rawCfg.correlativoCotizacion || '000080',
    prefijo_nota_entrega: rawCfg.prefijoNotaEntrega || '',
    correlativo_nota_entrega: rawCfg.correlativoNotaEntrega || '000100',
    prefijo_recibo: 'REC-',
    correlativo_recibo: '00001',
    dias_vencimiento_default: Number(rawCfg.diasVencimientoDefault || 15),
    notas_default: rawCfg.notasDefault || 'Los pagos en bolívares se calcularán a la tasa del BCV del día del pago.',
    comision_mode: rawCfg.comisionMode || 'emitidas',
    usa_maquina_fiscal: Boolean(rawCfg.usaMaquinaFiscal),
    marca_maquina_fiscal: rawCfg.marcaMaquinaFiscal || 'bixolon'
  };
  await supabase.from('configuracion_contable').upsert([configRow], { onConflict: 'empresa_id' });
  console.log(' -> Configuración contable y correlativos migrados.');

  // 4. CONTACTOS (CLIENTES & PROVEEDORES)
  console.log('[5/8] Migrando Contactos (Clientes y Proveedores)...');
  const contactos = (rawData.contacts || []).map((ct: any) => ({
    id: ct.id,
    empresa_id: companyId,
    name: ct.name || 'Sin Nombre',
    tax_id: ct.taxId || 'S/N',
    type: ct.type === 'customer' ? 'customer' : ct.type === 'supplier' ? 'supplier' : 'customer',
    email: ct.email || '',
    phone: ct.phone || '',
    address: ct.address || '',
    tipo_contribuyente: 'ordinario',
    saldo: Number(ct.saldo || 0),
    saldo_cxp: Number(ct.saldoCxp || 0),
    debit_account: ct.debitAccount || null,
    credit_account: ct.creditAccount || null,
    expense_account: ct.expenseAccount || null,
    activo: true
  }));
  const contactosCount = await chunkedUpsert('contactos', contactos);
  console.log(` -> ${contactosCount} de ${contactos.length} contactos migrados.`);

  // 5. BANCOS
  console.log('[6/8] Migrando Bancos y Cuentas...');
  const bancos = (rawData.banks || []).map((b: any) => ({
    id: b.id,
    empresa_id: companyId,
    banco: b.banco || 'Banco',
    numero_cuenta: b.cuenta || b.numeroCuenta || '0000',
    moneda: b.moneda || 'Bolivares',
    saldo: Number(b.saldo || 0),
    tasa: Number(b.tasa || 1),
    cuenta_contable_id: b.cuenta_contable_id || null,
    activo: true
  }));
  const bancosCount = await chunkedUpsert('bancos', bancos);
  console.log(` -> ${bancosCount} de ${bancos.length} cuentas bancarias migradas.`);

  // 6. SERVICIOS (CATÁLOGO DE OPERACIONES)
  console.log('[7/8] Migrando Catálogo de Servicios / Operaciones...');
  const servicios = (rawData.services || []).map((s: any) => ({
    id: s.id,
    empresa_id: companyId,
    nombre: s.nombre || 'Servicio',
    codigo: s.codigo || '',
    descripcion: s.descripcion || '',
    precio: Number(s.precio || s.precioBase || 0),
    precio_base: Number(s.precioBase || s.precio || 0),
    tipo: 'Servicio',
    tipo_iva: s.tipoIva || 'G',
    exento_iva: s.tipoIva === 'E',
    commission_percentage: Number(s.commissionPercentage || 0),
    cuenta_contable_id: s.cuentaContableId || null,
    cuenta_ingreso_id: s.cuentaContableId || null,
    activo: true
  }));
  const serviciosCount = await chunkedUpsert('servicios', servicios);
  console.log(` -> ${serviciosCount} de ${servicios.length} servicios de operaciones migrados.`);

  // 7. CUENTAS POR PAGAR (CXP)
  console.log('[8/8] Migrando Cuentas por Pagar (CXP)...');
  const cxpRows = (rawData.cxp || []).map((item: any) => ({
    id: item.id,
    empresa_id: companyId,
    factura_id: item.factura_id || item.id,
    proveedor_id: item.proveedor_id || item.proveedor || 'PROV',
    proveedor: item.proveedor || 'Proveedor',
    categoria: item.categoria || 'proveedores',
    fecha: item.fecha || new Date().toISOString().split('T')[0],
    vencimiento: item.vencimiento || item.fecha || new Date().toISOString().split('T')[0],
    descripcion: item.descripcion || 'Cuenta por pagar',
    tipo: item.tipo || 'factura',
    total: Number(item.total || 0),
    saldo: Number(item.saldo || 0),
    moneda: item.moneda === 'Dólares (USD)' ? 'USD' : 'VES',
    tasa: Number(item.tasa || 1)
  }));
  const cxpCount = await chunkedUpsert('cuentas_pagar_cxp', cxpRows);
  console.log(` -> ${cxpCount} de ${cxpRows.length} CXP migradas.`);

  // 8. CUENTAS POR COBRAR (CXC) & FACTURAS DE VENTA
  console.log('[+] Migrando Cuentas por Cobrar (CXC) y Facturas...');
  const cxcRows = (rawData.cxc || []).map((item: any) => ({
    id: item.id,
    empresa_id: companyId,
    factura_id: item.factura_id || item.id,
    cliente_id: item.cliente_id || item.cliente || 'CLIENTE',
    cliente: item.cliente || 'Cliente',
    categoria: item.categoria || 'clientes',
    fecha: item.fecha || new Date().toISOString().split('T')[0],
    vencimiento: item.vencimiento || item.fecha || new Date().toISOString().split('T')[0],
    descripcion: item.descripcion || 'Cuenta por cobrar',
    tipo: item.tipo || 'factura',
    total: Number(item.total || 0),
    saldo: Number(item.saldo || 0),
    moneda: item.moneda === 'Dólares (USD)' ? 'USD' : 'VES',
    tasa: Number(item.tasa || 1)
  }));
  const cxcCount = await chunkedUpsert('cuentas_cobrar_cxc', cxcRows);

  const facturasRows = (rawData.cxc || []).map((item: any) => ({
    id: item.id,
    empresa_id: companyId,
    numero: item.factura_id || item.id,
    tipo_documento: 'factura',
    cliente_id: item.cliente_id || item.cliente || 'CLIENTE',
    cliente_nombre: item.cliente || 'Cliente',
    fecha_emision: item.fecha || new Date().toISOString().split('T')[0],
    fecha_vencimiento: item.vencimiento || item.fecha || new Date().toISOString().split('T')[0],
    moneda: item.moneda === 'Dólares (USD)' ? 'USD' : 'VES',
    tasa_cambio: Number(item.tasa || 1),
    subtotal: Number(item.total || 0),
    base_imponible: Number(item.total || 0),
    monto_exento: 0,
    iva_porcentaje: 16,
    iva_monto: 0,
    igtf_monto: 0,
    total: Number(item.total || 0),
    saldo_pendiente: Number(item.saldo || 0),
    estado: Number(item.saldo || 0) <= 0 ? 'Cobrada' : (Number(item.saldo || 0) < Number(item.total || 0) ? 'Parcial' : 'Pendiente'),
    notas: item.descripcion || ''
  }));
  const facturasCount = await chunkedUpsert('facturas_venta', facturasRows);
  console.log(` -> ${cxcCount} cuentas por cobrar y ${facturasCount} facturas migradas.`);

  // 9. COMPROBANTES DE DIARIO & LÍNEAS
  console.log('[+] Migrando Comprobantes Contables y Asientos de Diario...');
  const comprobantesRows: any[] = [];
  const lineasRows: any[] = [];

  for (const entry of (rawData['accounting-entries'] || [])) {
    comprobantesRows.push({
      id: entry.id,
      empresa_id: companyId,
      numero: entry.numero || `CMP-${entry.id.substring(0, 6)}`,
      fecha: entry.fecha || new Date().toISOString().split('T')[0],
      tipo: entry.tipo || 'Diario',
      descripcion: entry.descripcion || 'Asiento Contable',
      referencia: entry.referencia || '',
      total: Number(entry.total || 0),
      estado: entry.estado || 'Contabilizado',
      created_by: entry.userId || 'migracion'
    });

    if (Array.isArray(entry.lineas)) {
      entry.lineas.forEach((lin: any, idx: number) => {
        lineasRows.push({
          id: lin.id || `lin_${entry.id}_${idx}`,
          comprobante_id: entry.id,
          cuenta_id: lin.cuentaId || lin.cuenta_id || '',
          descripcion: lin.descripcion || entry.descripcion || '',
          debe: Number(lin.debe || 0),
          haber: Number(lin.haber || 0),
          orden: idx
        });
      });
    }
  }
  const compCount = await chunkedUpsert('comprobantes_diario', comprobantesRows, 50);
  const linCount = await chunkedUpsert('lineas_comprobante', lineasRows, 200);
  console.log(` -> ${compCount} comprobantes y ${linCount} líneas contables migradas.`);

  // 10. MOVIMIENTOS BANCARIOS
  console.log('[+] Migrando Movimientos de Bancos...');
  const movimientosRows = (rawData['bank-transactions'] || []).map((m: any) => ({
    id: m.id,
    empresa_id: companyId,
    banco_id: m.banco_id,
    fecha: m.fecha || new Date().toISOString().split('T')[0],
    ref: m.ref || '',
    descripcion: m.descripcion || 'Movimiento bancario',
    tipo: m.tipo || 'ingreso',
    monto: Number(m.monto || 0),
    tasa: Number(m.tasa || 1),
    comprobante_id: m.comprobante_id || null,
    estado: m.estado || 'conciliado',
    notas: m.notas || ''
  }));
  const movCount = await chunkedUpsert('movimientos_bancos', movimientosRows, 100);
  console.log(` -> ${movCount} movimientos de bancos migrados.`);

  console.log('\n================================================================');
  console.log(' ¡MIGRACIÓN COMPLETADA EXITOSAMENTE EN SUPABASE!');
  console.log('================================================================');
  console.log(`Empresa:               ${empresaRow.nombre} (${empresaRow.rif})`);
  console.log(`Cuentas Contables:     ${cuentasCount}`);
  console.log(`Contactos:             ${contactosCount}`);
  console.log(`Cuentas Bancarias:     ${bancosCount}`);
  console.log(`Servicios Operaciones: ${serviciosCount}`);
  console.log(`Facturas / CxC:        ${cxcCount}`);
  console.log(`CXP:                   ${cxpCount}`);
  console.log(`Comprobantes Diario:   ${compCount}`);
  console.log(`Líneas Contables:      ${linCount}`);
  console.log(`Movimientos Bancos:    ${movCount}`);
  console.log('================================================================\n');

  process.exit(0);
}

runMigration().catch(err => {
  console.error('[FATAL ERROR EN MIGRACIÓN]:', err);
  process.exit(1);
});
