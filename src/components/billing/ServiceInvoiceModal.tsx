import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Trash2, Search, Printer, Save, CheckCircle, 
  DollarSign, Calculator, User, FileText, Calendar, Building2 
} from 'lucide-react';
import { dbSaveFacturaVenta, dbSaveContacto, dbSaveComprobante, dbFetchCuentasContables } from '../../services/db';
import { VoucherPreviewModal } from '../common/VoucherPreviewModal';
import CuentaSelectorTrigger from '../common/CuentaSelectorTrigger';
import CuentaContableModal from '../common/CuentaContableModal';

interface ServiceInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (factura: any) => void;
  contactos: any[];
  servicios: any[];
  bancos: any[];
  cuentasContables?: any[];
  configContable: any;
  empresa: any;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSave?: (collection: string, data: any) => void;
  reloadCxc?: () => Promise<void>;
  reloadComprobantes?: () => Promise<void>;
}

export const ServiceInvoiceModal: React.FC<ServiceInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  contactos = [],
  servicios = [],
  bancos = [],
  cuentasContables = [],
  configContable = {} as any,
  empresa,
  showToast,
  onSave,
  reloadCxc,
  reloadComprobantes
}) => {
  if (!isOpen) return null;

  // Estado local para cuentas contables con carga diferida si es necesario
  const [localCuentas, setLocalCuentas] = useState<any[]>(cuentasContables || []);

  useEffect(() => {
    if (cuentasContables && cuentasContables.length > 0) {
      setLocalCuentas(cuentasContables);
    } else if (empresa?.id) {
      dbFetchCuentasContables(empresa.id).then(data => {
        if (data && data.length > 0) setLocalCuentas(data);
      });
    }
  }, [cuentasContables, empresa?.id]);

  // Correlativo desde configuración
  const prefijo = configContable?.prefijoFactura || '';
  const correlativoConfig = configContable?.correlativoFactura || '00001';
  const numeroSugerido = `${prefijo}${correlativoConfig}`;

  // Estados del encabezado
  const [numero, setNumero] = useState(numeroSugerido);
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'nota_entrega' | 'cotizacion'>('factura');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [diasCredito, setDiasCredito] = useState(Number(configContable?.diasVencimientoDefault || 15));
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(configContable?.diasVencimientoDefault || 15));
    return d.toISOString().split('T')[0];
  });
  const [tasaCambio, setTasaCambio] = useState<number>(() => {
    // Buscar tasa de bancos o default 40.0
    const primerBancoConTasa = bancos.find(b => Number(b.tasa) > 1);
    return primerBancoConTasa ? Number(primerBancoConTasa.tasa) : 36.50;
  });

  // Estado del Cliente
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [clienteSearch, setClienteSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isNewClientModal, setIsNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRif, setNewClientRif] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCuenta, setNewClientCuenta] = useState('');
  const [showFastCuentaModal, setShowFastCuentaModal] = useState(false);

  // Término de Pago
  const [terminoPago, setTerminoPago] = useState<'contado' | 'credito'>('contado');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [bancoId, setBancoId] = useState<string>(bancos[0]?.id || '');
  const [notas, setNotas] = useState('');

  const selectedBanco = useMemo(() => {
    return bancos.find(b => String(b.id) === String(bancoId));
  }, [bancos, bancoId]);

  const isBancoVES = useMemo(() => {
    if (!selectedBanco) return false;
    const mon = (selectedBanco.moneda || '').toLowerCase();
    const name = (selectedBanco.banco || selectedBanco.nombre || '').toLowerCase();
    return mon === 'ves' || mon === 'bs' || mon === 'bs.' || mon === 'bolivares' || name.includes('bolivares') || (name.includes('venezuela') && mon !== 'usd');
  }, [selectedBanco]);

  const isContadoVES = terminoPago === 'contado' && isBancoVES;

  useEffect(() => {
    if (selectedBanco && Number(selectedBanco.tasa) > 1) {
      setTasaCambio(Number(selectedBanco.tasa));
    }
  }, [selectedBanco]);

  // Renglones / Detalles de la factura
  const [detalles, setDetalles] = useState<any[]>([
    {
      id: 'item-1',
      servicioId: '',
      nombre: '',
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      exento: false
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar clientes
  const clientesList = useMemo(() => {
    return contactos.filter(c => c.type === 'customer' || c.type === 'both');
  }, [contactos]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch) return clientesList.slice(0, 10);
    const term = clienteSearch.toLowerCase();
    return clientesList.filter(c => 
      (c.name || '').toLowerCase().includes(term) || 
      (c.taxId || '').toLowerCase().includes(term)
    );
  }, [clientesList, clienteSearch]);

  // Actualizar fecha de vencimiento cuando cambian días de crédito o fecha de emisión
  useEffect(() => {
    if (terminoPago === 'credito') {
      const d = new Date(fechaEmision);
      d.setDate(d.getDate() + Number(diasCredito || 0));
      setFechaVencimiento(d.toISOString().split('T')[0]);
    } else {
      setFechaVencimiento(fechaEmision);
    }
  }, [fechaEmision, diasCredito, terminoPago]);

  // Agregar renglón
  const handleAddLine = () => {
    setDetalles(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        servicioId: '',
        nombre: '',
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        exento: false
      }
    ]);
  };

  // Eliminar renglón
  const handleRemoveLine = (idx: number) => {
    if (detalles.length <= 1) {
      setDetalles([{
        id: 'item-1',
        servicioId: '',
        nombre: '',
        descripcion: '',
        cantidad: 1,
        precioUnitario: 0,
        exento: false
      }]);
      return;
    }
    setDetalles(prev => prev.filter((_, i) => i !== idx));
  };

  // Actualizar renglón
  const handleUpdateLine = (idx: number, field: string, value: any) => {
    setDetalles(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      // Si seleccionó un servicio del catálogo, rellenar datos
      if (field === 'servicioId') {
        const srv = servicios.find(s => String(s.id) === String(value));
        if (srv) {
          updated[idx].nombre = srv.nombre || srv.name || '';
          updated[idx].descripcion = srv.descripcion || '';
          updated[idx].precioUnitario = Number(srv.precioBase || srv.precio || 0);
          updated[idx].exento = Boolean(srv.exentoIva);
          updated[idx].cuentaContableId = srv.cuentaContableId || srv.cuenta_contable_id || srv.cuentaIngresoId || '';
        }
      }
      return updated;
    });
  };

  // Cálculos financieros
  const { subtotal, montoExento, baseImponible, ivaMonto, totalUsd, totalVes } = useMemo(() => {
    let sub = 0;
    let exento = 0;
    let gravable = 0;

    detalles.forEach(line => {
      const cant = Number(line.cantidad) || 0;
      const precio = Number(line.precioUnitario) || 0;
      const lineTotal = cant * precio;
      sub += lineTotal;
      if (line.exento) {
        exento += lineTotal;
      } else {
        gravable += lineTotal;
      }
    });

    const ivaPorc = Number(configContable?.iva || 16) / 100;
    const iva = gravable * ivaPorc;
    const total = sub + iva;
    const effectiveTasa = isContadoVES ? (Number(tasaCambio) || 1) : 1;
    const ves = total * effectiveTasa;

    return {
      subtotal: sub,
      montoExento: exento,
      baseImponible: gravable,
      ivaMonto: iva,
      totalUsd: total,
      totalVes: ves
    };
  }, [detalles, configContable?.iva, tasaCambio, isContadoVES]);

  // Apertura de modal de cliente rápido
  const handleOpenNewClientModal = () => {
    const defaultCxc = configContable?.cuentaCxc || 
      localCuentas.find(c => c.codigo === '1.1.03.01' || c.codigo === '1.1.03')?.id || 
      '1.1.03.01';
    setNewClientCuenta(defaultCxc);
    setNewClientName('');
    setNewClientRif('');
    setNewClientPhone('');
    setNewClientAddress('');
    setIsNewClientModal(true);
  };

  // Guardar nuevo cliente rápido
  const handleCreateFastClient = async () => {
    if (!newClientName.trim() || !newClientRif.trim()) {
      if (showToast) showToast('Nombre y RIF son obligatorios', 'error');
      return;
    }

    if (!newClientCuenta || !newClientCuenta.trim()) {
      if (showToast) showToast('Debe configurar la cuenta contable para el cliente', 'error');
      return;
    }

    const nuevo = {
      id: `cli_${Date.now()}`,
      name: newClientName.trim(),
      taxId: newClientRif.trim().toUpperCase(),
      type: 'customer',
      phone: newClientPhone.trim(),
      address: newClientAddress.trim(),
      debitAccount: newClientCuenta.trim(),
      activo: true
    };

    try {
      await dbSaveContacto(nuevo, empresa?.id || 'default');
      if (onSave) onSave('contactos', nuevo);
      setSelectedCliente(nuevo);
      setIsNewClientModal(false);
      if (showToast) showToast('Cliente registrado con éxito', 'success');
    } catch {
      if (onSave) onSave('contactos', nuevo);
      setSelectedCliente(nuevo);
      setIsNewClientModal(false);
    }
  };

  // Estado para previsualización y confirmación del Asiento Contable
  const [pendingVoucher, setPendingVoucher] = useState<{
    comprobante: any;
    facturaData: any;
    shouldPrint: boolean;
  } | null>(null);

  // Helper para resolver el ID de la cuenta contable en cuentasContables
  const findCuentaId = (ref: string | undefined, defaultPrefix: string) => {
    const list = (localCuentas && localCuentas.length > 0) ? localCuentas : cuentasContables;
    if (!list || list.length === 0) return ref || defaultPrefix || '';

    const cleanRef = String(ref || '').trim();
    if (cleanRef) {
      const byId = list.find(c => String(c.id).trim().toLowerCase() === cleanRef.toLowerCase() && (c.tipo === 'Movimiento' || !c.tipo));
      if (byId) return byId.id;

      const byCode = list.find(c => String(c.codigo).trim().toLowerCase() === cleanRef.toLowerCase() && (c.tipo === 'Movimiento' || !c.tipo));
      if (byCode) return byCode.id;

      const normRef = cleanRef.replace(/\./g, '');
      const byNorm = list.find(c => String(c.codigo || '').replace(/\./g, '') === normRef && (c.tipo === 'Movimiento' || !c.tipo));
      if (byNorm) return byNorm.id;

      const byPrefix = list.find(c => String(c.codigo || '').startsWith(cleanRef) && (c.tipo === 'Movimiento' || !c.tipo));
      if (byPrefix) return byPrefix.id;
    }

    if (defaultPrefix) {
      const cleanDef = defaultPrefix.trim();
      const byDef = list.find(c => String(c.codigo || '').startsWith(cleanDef) && (c.tipo === 'Movimiento' || !c.tipo));
      if (byDef) return byDef.id;
      const byDefId = list.find(c => String(c.id || '').startsWith(cleanDef) && (c.tipo === 'Movimiento' || !c.tipo));
      if (byDefId) return byDefId.id;
    }

    const anyMov = list.find(c => c.tipo === 'Movimiento');
    return cleanRef || (anyMov ? anyMov.id : '');
  };

  // Procesar Emisión -> Construye el Asiento Contable y Abre el Modal de Previsualización
  const handleSubmit = (shouldPrint = false) => {
    if (!selectedCliente) {
      if (showToast) showToast('Por favor selecciona un cliente', 'error');
      return;
    }

    if (detalles.length === 0 || totalUsd <= 0) {
      if (showToast) showToast('Debes agregar al menos un concepto o servicio válido', 'error');
      return;
    }

    const facturaData = {
      numero,
      tipoDocumento,
      clienteId: selectedCliente.id,
      clienteNombre: selectedCliente.name,
      clienteRif: selectedCliente.taxId,
      clienteTelefono: selectedCliente.phone || '',
      clienteDireccion: selectedCliente.address || '',
      fechaEmision,
      fechaVencimiento,
      moneda: 'USD',
      tasaCambio: isContadoVES ? (Number(tasaCambio) || 1) : 1,
      subtotal,
      baseImponible,
      montoExento,
      ivaPorcentaje: Number(configContable?.iva || 16),
      ivaMonto,
      total: totalUsd,
      saldoPendiente: terminoPago === 'contado' ? 0 : totalUsd,
      estado: terminoPago === 'contado' ? 'Cobrada' : 'Pendiente',
      metodoPago: terminoPago === 'contado' ? metodoPago : 'Crédito',
      bancoId: terminoPago === 'contado' ? bancoId : null,
      montoPagado: terminoPago === 'contado' ? totalUsd : 0,
      vuelto: 0,
      esPos: false,
      detalles,
      notas
    };

    const observacionUsuario = (notas && notas.trim()) || '';
    const descripcionPrincipal = observacionUsuario || `Facturación: ${numero} - ${selectedCliente.name}`;

    // 1. Debe: Cuenta Activo del contacto seleccionado (Ej: 1.1.03.01 Cuentas por Cobrar Clientes)
    const contactoCuentaRef = selectedCliente.debitAccount || selectedCliente.debit_account || selectedCliente.debit_account_id || configContable?.cuentaCxc || '1.1.03.01';
    const clienteActivoCuentaId = findCuentaId(contactoCuentaRef, configContable?.cuentaCxc || '1.1.03');

    const lineas: any[] = [
      {
        id: `l-cxc-${Date.now()}`,
        cuentaId: clienteActivoCuentaId,
        descripcion: descripcionPrincipal,
        debe: totalUsd,
        haber: 0
      }
    ];

    // 2. Haber: Cuentas de Ingreso de los artículos de operaciones seleccionados (Ej: 4.1.01.01 Importación de Contenedores)
    detalles.forEach((det, idx) => {
      const srv = servicios.find(s => String(s.id) === String(det.servicioId) || String(s.codigo) === String(det.servicioId));
      const srvCuentaRef = det.cuentaContableId || srv?.cuentaContableId || srv?.cuenta_contable_id || srv?.cuentaIngresoId || configContable?.cuentaIngresos || '4.1.01.01';
      const srvCuentaId = findCuentaId(srvCuentaRef, configContable?.cuentaIngresos || '4.1.01');

      const montoItem = Number(det.subtotal !== undefined ? det.subtotal : (Number(det.cantidad || 1) * Number(det.precioUnitario || 0))) || 0;

      lineas.push({
        id: `l-ing-${Date.now()}-${idx}`,
        cuentaId: srvCuentaId,
        descripcion: descripcionPrincipal,
        debe: 0,
        haber: montoItem
      });
    });

    // 3. Haber: IVA Débito Fiscal si aplica (Ej: 2.1.04.01 IVA Débito Fiscal)
    if (ivaMonto > 0) {
      const ivaCuentaRef = configContable?.cuentaDebitoFiscal || '2.1.04.01';
      const ivaCuentaId = findCuentaId(ivaCuentaRef, '2.1.04');
      lineas.push({
        id: `l-iva-${Date.now()}`,
        cuentaId: ivaCuentaId,
        descripcion: descripcionPrincipal,
        debe: 0,
        haber: ivaMonto
      });
    }

    const tDebe = lineas.reduce((acc, curr) => acc + (Number(curr.debe) || 0), 0);
    const tHaber = lineas.reduce((acc, curr) => acc + (Number(curr.haber) || 0), 0);
    const isBalanced = Math.abs(tDebe - tHaber) < 0.01;

    const draftComprobante = {
      id: `comp_${Date.now()}`,
      numero: `CMP-${Date.now().toString().slice(-6)}`,
      fecha: fechaEmision,
      tipo: 'Diario',
      descripcion: descripcionPrincipal,
      referencia: numero,
      total: Math.max(tDebe, tHaber),
      estado: isBalanced ? 'Contabilizado' : 'Descuadrado',
      lineas: lineas
    };

    // Abre el modal para revisar y contabilizar el asiento contable
    setPendingVoucher({
      comprobante: draftComprobante,
      facturaData,
      shouldPrint
    });
  };

  // Confirmar y Guardar Asiento Contable + Factura
  const handleConfirmVoucher = async (finalComprobante: any) => {
    if (!pendingVoucher) return;
    setIsSubmitting(true);
    const cid = empresa?.id || 'default';

    try {
      // 1. Guardar Comprobante Contable en Supabase y local
      await dbSaveComprobante(finalComprobante, cid);
      if (onSave) {
        await onSave('comprobantes', finalComprobante);
      }
      if (reloadComprobantes) {
        await reloadComprobantes();
      }

      // 2. Guardar Factura vinculada al comprobante
      const facturaFinal = {
        ...pendingVoucher.facturaData,
        notas: finalComprobante.descripcion || pendingVoucher.facturaData.notas,
        comprobanteId: finalComprobante.id
      };

      const result = await dbSaveFacturaVenta(facturaFinal, cid);

      if (result.success) {
        if (result.cxc && onSave) {
          onSave('cxc', result.cxc);
        }
        if (result.movimientoBanco && onSave) {
          onSave('movimientosBancos', result.movimientoBanco);
        }
        if (reloadCxc) {
          await reloadCxc();
        }
        if (showToast) showToast(`Factura ${numero} y Asiento Contable registrados con éxito`, 'success');
        onInvoiceCreated(result.data);
        setPendingVoucher(null);
        onClose();
      } else {
        if (showToast) showToast('Ocurrió un error al guardar la factura', 'error');
      }
    } catch (e: any) {
      if (showToast) showToast(e?.message || 'Error al emitir factura y asiento contable', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileText className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Emisión de Factura de Servicios</h2>
              <p className="text-xs text-emerald-100 font-medium">Facturación Administrativa con Correlativo NIIF</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-100">
          
          {/* Fila 1: Parámetros del Documento & Correlativo */}
          <div className={`grid grid-cols-1 ${isContadoVES ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60`}>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Tipo Documento
              </label>
              <select
                value={tipoDocumento}
                onChange={e => setTipoDocumento(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="factura">Factura de Servicios</option>
                <option value="nota_entrega">Nota de Entrega</option>
                <option value="cotizacion">Presupuesto / Cotización</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                N° de Factura / Correlativo
              </label>
              <input
                type="text"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="FAC-00001"
              />
              <span className="text-[10px] text-slate-400">Configurado en Ajustes</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Fecha de Emisión
              </label>
              <input
                type="date"
                value={fechaEmision}
                onChange={e => setFechaEmision(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {isContadoVES && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Tasa de Cambio (VES/USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={tasaCambio}
                    onChange={e => setTasaCambio(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">Bs</span>
                </div>
              </div>
            )}
          </div>

          {/* Fila 2: Selector de Cliente */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-600" />
                Datos del Cliente
              </label>
              <button
                type="button"
                onClick={handleOpenNewClientModal}
                className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Nuevo Cliente
              </button>
            </div>

            {selectedCliente ? (
              <div className="flex items-center justify-between p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-lg">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {selectedCliente.name}
                    <span className="px-2 py-0.5 text-xs bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded font-semibold">
                      {selectedCliente.taxId}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedCliente.address || 'Sin dirección'} {selectedCliente.phone ? `• Tlf: ${selectedCliente.phone}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCliente(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Cambiar cliente"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={clienteSearch}
                      onChange={e => {
                        setClienteSearch(e.target.value);
                        setIsClientDropdownOpen(true);
                      }}
                      onFocus={() => setIsClientDropdownOpen(true)}
                      placeholder="Buscar cliente por nombre o RIF..."
                      className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {isClientDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No se encontraron clientes coincidentes.
                      </div>
                    ) : (
                      clientesFiltrados.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCliente(c);
                            setIsClientDropdownOpen(false);
                            setClienteSearch('');
                          }}
                          className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                        >
                          <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{c.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">RIF: {c.taxId}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fila 3: Renglones de Servicios */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Detalle de Servicios y Conceptos
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Línea
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-1/4">Servicio / Catálogo</th>
                    <th className="p-3">Descripción Personalizada</th>
                    <th className="p-3 w-20 text-center">Cant.</th>
                    <th className="p-3 w-28 text-right">Precio ($)</th>
                    <th className="p-3 w-20 text-center">Exento</th>
                    <th className="p-3 w-28 text-right">Subtotal ($)</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detalles.map((item, idx) => {
                    const cant = Number(item.cantidad) || 0;
                    const precio = Number(item.precioUnitario) || 0;
                    const lineTotal = cant * precio;

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2">
                          <select
                            value={item.servicioId || ''}
                            onChange={e => handleUpdateLine(idx, 'servicioId', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="">-- Personalizado --</option>
                            {servicios.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.nombre || s.name} (${Number(s.precioBase || s.precio || 0).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={item.nombre || ''}
                            onChange={e => handleUpdateLine(idx, 'nombre', e.target.value)}
                            placeholder="Descripción del concepto..."
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-teal-500"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={e => handleUpdateLine(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                            className="w-full text-center px-1.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-teal-500"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precioUnitario}
                            onChange={e => handleUpdateLine(idx, 'precioUnitario', Number(e.target.value))}
                            className="w-full text-right px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-teal-500"
                          />
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(item.exento)}
                            onChange={e => handleUpdateLine(idx, 'exento', e.target.checked)}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        <td className="p-2 text-right font-bold text-slate-800 dark:text-slate-100">
                          ${lineTotal.toFixed(2)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Eliminar renglón"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fila 4: Términos de Pago & Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
            {/* Columna Izquierda: Modalidad de Pago & Notas */}
            <div className="md:col-span-7 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Condición y Término de Pago
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label 
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      terminoPago === 'contado'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="terminoPago"
                      value="contado"
                      checked={terminoPago === 'contado'}
                      onChange={() => setTerminoPago('contado')}
                      className="text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-xs">De Contado</div>
                      <div className="text-[10px] text-slate-500">Cobro inmediato / Cancelada</div>
                    </div>
                  </label>

                  <label 
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      terminoPago === 'credito'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="terminoPago"
                      value="credito"
                      checked={terminoPago === 'credito'}
                      onChange={() => setTerminoPago('credito')}
                      className="text-amber-600"
                    />
                    <div>
                      <div className="font-bold text-xs">A Crédito (CxC)</div>
                      <div className="text-[10px] text-slate-500">Genera Cuenta por Cobrar</div>
                    </div>
                  </label>
                </div>

                {terminoPago === 'contado' ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Forma de Pago
                      </label>
                      <select
                        value={metodoPago}
                        onChange={e => setMetodoPago(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      >
                        <option value="efectivo">Efectivo USD ($)</option>
                        <option value="efectivo_ves">Efectivo VES (Bs)</option>
                        <option value="punto_debito">Punto de Venta (Tarjeta)</option>
                        <option value="pago_movil">Pago Móvil</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="zelle">Zelle / Divisas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Caja o Banco Receptor
                      </label>
                      <select
                        value={bancoId}
                        onChange={e => setBancoId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      >
                        {bancos.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.banco || b.nombre} ({b.moneda || 'USD'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {isContadoVES && (
                      <div className="col-span-2 p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-200">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          Monto a recibir en Bolívares (Tasa: {tasaCambio}):
                        </span>
                        <span className="font-black font-mono text-amber-800 dark:text-amber-300 text-sm">
                          Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Días de Vencimiento
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={diasCredito}
                        onChange={e => setDiasCredito(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Fecha Vence
                      </label>
                      <input
                        type="date"
                        value={fechaVencimiento}
                        onChange={e => setFechaVencimiento(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Notas u Observaciones
                </label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={2}
                  placeholder="Información adicional visible en la factura..."
                  className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de Totales */}
            <div className="md:col-span-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal Bruto:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {montoExento > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Monto Exento:</span>
                    <span>${montoExento.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Base Imponible:</span>
                  <span className="font-semibold">${baseImponible.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>IVA ({Number(configContable?.iva || 16)}%):</span>
                  <span className="font-semibold">${ivaMonto.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between items-baseline text-base font-bold text-slate-900 dark:text-white">
                    <span>TOTAL FACTURA:</span>
                    <span className="text-xl text-teal-700 dark:text-teal-400">${totalUsd.toFixed(2)}</span>
                  </div>
                  {isContadoVES && (
                    <>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Equivalente en Bolívares:</span>
                        <span className="text-sm font-mono">Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right font-mono">
                        Tasa: Bs. {Number(tasaCambio).toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer con Acciones */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Guardando...' : 'Emitir Factura'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Rápido de Nuevo Cliente */}
      {isNewClientModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              Registrar Cliente Rápido
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  placeholder="Ej: Inversiones Los Andes, C.A."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">CI / RIF *</label>
                <input
                  type="text"
                  value={newClientRif}
                  onChange={e => setNewClientRif(e.target.value)}
                  placeholder="Ej: J-12345678-0 o V-12345678"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={e => setNewClientPhone(e.target.value)}
                  placeholder="Ej: 0414-1234567"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Dirección Fiscal</label>
                <textarea
                  value={newClientAddress}
                  onChange={e => setNewClientAddress(e.target.value)}
                  rows={2}
                  placeholder="Ej: Av. Francisco de Miranda, Edif..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Cuenta Contable (Activo / CxC) *</label>
                <CuentaSelectorTrigger
                  value={newClientCuenta}
                  cuentasContables={localCuentas}
                  onClick={() => setShowFastCuentaModal(true)}
                  onClear={() => setNewClientCuenta('')}
                  placeholder="Seleccionar cuenta de CxC..."
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewClientModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFastClient}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Cuenta para Cliente Rápido */}
      {showFastCuentaModal && (
        <CuentaContableModal
          isOpen={showFastCuentaModal}
          onClose={() => setShowFastCuentaModal(false)}
          onSelect={(c) => {
            if (c) setNewClientCuenta(c.id);
            setShowFastCuentaModal(false);
          }}
          cuentasContables={localCuentas}
          title="Cuenta Contable para Cliente"
          subtitle="Seleccione la cuenta de activo / cuentas por cobrar para este cliente"
        />
      )}

      {/* Modal de Previsualización y Confirmación de Asiento Contable */}
      {pendingVoucher && (
        <VoucherPreviewModal
          isOpen={!!pendingVoucher}
          onClose={() => setPendingVoucher(null)}
          initialComprobante={pendingVoucher.comprobante}
          cuentasContables={localCuentas.length > 0 ? localCuentas : cuentasContables}
          empresaId={empresa?.id || 'empresa-local-1'}
          onConfirm={handleConfirmVoucher}
          title="Contabilizar Factura de Servicios"
          subtitle={`Asiento contable automático para Factura ${numero} - ${selectedCliente?.name || ''}`}
        />
      )}
    </div>
  );
};

export default ServiceInvoiceModal;
