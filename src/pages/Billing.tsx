import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, Plus, Eye, Edit, DollarSign, Calendar, CalendarDays, 
  User, FileText, Search, Tag, X, RefreshCw, Building2, Users, 
  ArrowUpRight, Calculator, Check, Briefcase, ShoppingCart, 
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Download, Printer, Trash2,
  UtensilsCrossed
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { 
  dbFetchFacturasVenta, 
  dbAnularFacturaVenta, 
  dbFetchServicios, 
  dbFetchContactos, 
  dbFetchBancos, 
  dbFetchConfiguracionContable,
  dbFetchCuentasContables
} from '../services/db';
import BackButton from '../components/common/BackButton';
import ServiceInvoiceModal from '../components/billing/ServiceInvoiceModal';
import PosCashRegister from '../components/billing/PosCashRegister';
import PosTicketPrint from '../components/billing/PosTicketPrint';
import { PrintPreview } from '../components/PrintPreview';

interface BillingProps {
  contactos?: any[];
  bancos?: any[];
  servicios?: any[];
  cuentasContables?: any[];
  configContable?: any;
  workingYear?: string;
  onSave?: (collection: string, data: any) => void;
  reloadCxc?: () => Promise<void>;
  reloadComprobantes?: () => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Helpers de formato de fechas en español (idéntico a Sistema jt)
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const formatMonthLabel = (monthKey: string) => {
  if (!monthKey || monthKey.length < 7) return monthKey;
  const [year, month] = monthKey.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MESES_ES[idx] || month} ${year}`;
};

const formatDayDetails = (dateStr: string) => {
  if (!dateStr) return { dayOfWeek: '', dayNumber: '', formatted: '', full: '' };
  const parts = dateStr.split('-');
  if (parts.length < 3) return { dayOfWeek: '', dayNumber: dateStr, formatted: dateStr, full: dateStr };
  const [year, month, day] = parts;
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const dayOfWeek = DIAS_SEMANA_ES[d.getDay()] || '';
  const monthName = MESES_ES[parseInt(month, 10) - 1] || month;
  return {
    dayOfWeek,
    dayNumber: day,
    formatted: `${day}/${month}/${year}`,
    full: `${dayOfWeek}, ${day} de ${monthName} de ${year}`
  };
};

const getFacturaDate = (f: any): string => {
  const raw = f.fechaEmision || f.fecha || f.date || f.created_at || '';
  if (!raw) return '';
  return String(raw).substring(0, 10);
};

export default function Billing({
  contactos = [],
  bancos = [],
  servicios = [],
  cuentasContables = [],
  configContable = {} as any,
  workingYear,
  onSave,
  reloadCxc,
  reloadComprobantes
}: BillingProps) {
  const { activeCompanyId, availableCompanies } = useCompany();
  const activeCompany = availableCompanies.find(c => c.id === activeCompanyId);

  // Filtro de Mes (por defecto mes actual YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Día seleccionado para ver detalle (null = vista resumen del mes por días)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Estados de datos
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [selectedFacturaForView, setSelectedFacturaForView] = useState<any | null>(null);
  const [selectedFacturaForPrint, setSelectedFacturaForPrint] = useState<any | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Cargar facturas
  const loadFacturas = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const data = await dbFetchFacturasVenta(activeCompanyId);
      setFacturas(data);
    } catch (e) {
      console.warn('Error loading facturas:', e);
    } finally {
      setLoading(false);
    }
  };

  const [allCuentas, setAllCuentas] = useState<any[]>(cuentasContables || []);

  useEffect(() => {
    if (cuentasContables && cuentasContables.length > 0) {
      setAllCuentas(cuentasContables);
    } else if (activeCompanyId) {
      dbFetchCuentasContables(activeCompanyId).then(data => {
        if (data && data.length > 0) setAllCuentas(data);
      });
    }
  }, [cuentasContables, activeCompanyId]);

  useEffect(() => {
    loadFacturas();
  }, [activeCompanyId]);

  // Navegación de Meses
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${py}-${pm}`);
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const ny = nextDate.getFullYear();
    const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${ny}-${nm}`);
    setSelectedDate(null);
  };

  // Facturas del mes seleccionado
  const monthFacturas = useMemo(() => {
    return facturas.filter(f => {
      const d = getFacturaDate(f);
      return d.startsWith(selectedMonth);
    });
  }, [facturas, selectedMonth]);

  // Resumen Diario del Mes Seleccionado (Agrupación por Días)
  const dailySummaries = useMemo(() => {
    const map = new Map<string, {
      fecha: string;
      count: number;
      totalVendido: number;
      totalContado: number;
      totalCredito: number;
      clientes: Set<string>;
      metodosPago: Set<string>;
      serviciosCount: number;
    }>();

    monthFacturas.forEach(f => {
      const d = getFacturaDate(f);
      if (!d) return;

      if (!map.has(d)) {
        map.set(d, {
          fecha: d,
          count: 0,
          totalVendido: 0,
          totalContado: 0,
          totalCredito: 0,
          clientes: new Set(),
          metodosPago: new Set(),
          serviciosCount: 0
        });
      }

      const day = map.get(d)!;
      day.count += 1;
      const venta = Number(f.total) || 0;
      day.totalVendido += venta;
      
      const metodo = String(f.metodoPago || f.metodo_pago || '').toLowerCase();
      const termino = String(f.terminoPago || f.termino_pago || '').toLowerCase();
      const condicion = String(f.condicion || f.condicionPago || '').toLowerCase();
      
      const isCredito = 
        termino === 'credito' || 
        condicion === 'credito' || 
        metodo.includes('crédito') || 
        metodo.includes('credito') ||
        (f.estado === 'Pendiente' && !metodo.includes('efectivo') && !metodo.includes('transferencia'));

      if (isCredito) {
        day.totalCredito += venta;
      } else {
        day.totalContado += venta;
      }

      const detalles = Array.isArray(f.detalles) ? f.detalles : [];
      day.serviciosCount += detalles.length > 0 ? detalles.length : 1;

      if (f.clienteNombre) day.clientes.add(f.clienteNombre);
      if (f.metodoPago) day.metodosPago.add(f.metodoPago);
    });

    return Array.from(map.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [monthFacturas]);

  // KPIs del Mes
  const monthKpis = useMemo(() => {
    let totalVendido = 0;
    let totalContado = 0;
    let totalCredito = 0;
    let totalComprobantes = 0;
    let totalServicios = 0;

    dailySummaries.forEach(d => {
      totalVendido += d.totalVendido;
      totalContado += d.totalContado;
      totalCredito += d.totalCredito;
      totalComprobantes += d.count;
      totalServicios += d.serviciosCount;
    });

    return {
      daysCount: dailySummaries.length,
      totalComprobantes,
      totalServicios,
      totalVendido,
      totalContado,
      totalCredito
    };
  }, [dailySummaries]);

  // Facturas del día seleccionado
  const dayFacturas = useMemo(() => {
    if (!selectedDate) return [];
    return facturas.filter(f => getFacturaDate(f) === selectedDate);
  }, [facturas, selectedDate]);

  // Facturas del día filtradas por buscador
  const filteredDayFacturas = useMemo(() => {
    if (!searchTerm.trim()) return dayFacturas;
    const term = searchTerm.toLowerCase();
    return dayFacturas.filter(f => 
      (f.numero || '').toLowerCase().includes(term) ||
      (f.clienteNombre || '').toLowerCase().includes(term) ||
      (f.clienteRif || '').toLowerCase().includes(term) ||
      (f.metodoPago || '').toLowerCase().includes(term)
    );
  }, [dayFacturas, searchTerm]);

  // KPIs del día
  const dayKpis = useMemo(() => {
    let totalVendido = 0;
    let totalContado = 0;
    let totalCredito = 0;

    filteredDayFacturas.forEach(f => {
      const v = Number(f.total) || 0;
      totalVendido += v;
      if (f.estado === 'Cobrada') totalContado += v;
      else totalCredito += Number(f.saldoPendiente ?? v);
    });

    return {
      count: filteredDayFacturas.length,
      totalVendido,
      totalContado,
      totalCredito
    };
  }, [filteredDayFacturas]);

  const tasaOficial = Number(bancos.find(b => Number(b.tasa) > 1)?.tasa || 36.50);

  const formatMoney = (amount: number, curr: string = 'USD') => {
    const n = Number(amount) || 0;
    let parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const formatted = parts.join(',');
    return curr === 'VES' ? `Bs. ${formatted}` : `$ ${formatted}`;
  };

  // Exportar Mes a CSV (idéntico al de Sistema jt)
  const handleExportMonthCSV = () => {
    if (monthFacturas.length === 0) {
      showToast('No hay ventas registradas en este mes', 'info');
      return;
    }

    const headers = [
      'Nro Comprobante', 'Fecha', 'Tipo', 'Cliente', 'RIF/CI',
      'Metodo Pago', 'Total USD', 'Total VES', 'Estado'
    ];

    const rows = monthFacturas.map(f => {
      const totalUsd = Number(f.total) || 0;
      const totalVes = totalUsd * (Number(f.tasaCambio) || tasaOficial);
      return [
        `"${f.numero || f.id}"`,
        `"${getFacturaDate(f)}"`,
        `"${f.tipoDocumento === 'ticket_pos' ? 'Ticket POS' : 'Factura Serv.'}"`,
        `"${f.clienteNombre || ''}"`,
        `"${f.clienteRif || ''}"`,
        `"${f.metodoPago || 'Efectivo'}"`,
        totalUsd.toFixed(2),
        totalVes.toFixed(2),
        `"${f.estado || 'Cobrada'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `facturacion_ventas_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Anular Factura
  const handleAnular = async (id: string, numero: string) => {
    if (!window.confirm(`¿Estás seguro de anular el comprobante #${numero}?`)) return;
    try {
      await dbAnularFacturaVenta(id, activeCompanyId || 'default');
      showToast(`Comprobante #${numero} anulado con éxito`, 'success');
      loadFacturas();
      if (reloadCxc) reloadCxc();
    } catch {
      showToast('No se pudo anular el comprobante', 'error');
    }
  };

  // ============================================================================
  // MODALES COMPARTIDOS (VER COMPROBANTE / VOUCHER COMPLETO)
  // ============================================================================
  const renderSharedModals = () => (
    <>
      {/* Modal Ver Detalles de la Factura (Voucher Completo Estilo Sistema jt) */}
      {selectedFacturaForView && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Header del Documento */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {selectedFacturaForView.tipoDocumento === 'ticket_pos' ? 'Ticket Caja POS' : 'Factura de Servicios'}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      N° {selectedFacturaForView.numero}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Fecha: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedFacturaForView.fechaEmision}</span> • Estado: <span className="font-bold uppercase text-emerald-600">{selectedFacturaForView.estado}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedFacturaForPrint(selectedFacturaForView);
                    setIsPrintOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Ticket</span>
                </button>
                <button 
                  onClick={() => setSelectedFacturaForView(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Datos del Cliente y Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span>Cliente Receptor</span>
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {selectedFacturaForView.clienteNombre || 'Consumidor Final'}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  RIF/CI: <span className="font-bold">{selectedFacturaForView.clienteRif || 'V-00000000'}</span>
                </div>
                {selectedFacturaForView.clienteTelefono && (
                  <div className="text-xs text-slate-500 mt-0.5">Tlf: {selectedFacturaForView.clienteTelefono}</div>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Condición & Método de Cobro</span>
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white capitalize">
                  {selectedFacturaForView.metodoPago || 'Efectivo'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Modalidad: <span className="font-bold">{selectedFacturaForView.esPos ? 'Punto de Venta Mostrador' : 'Administrativa'}</span>
                </div>
                {selectedFacturaForView.notas && (
                  <div className="text-xs text-slate-500 mt-1 italic truncate">Notas: {selectedFacturaForView.notas}</div>
                )}
              </div>
            </div>

            {/* Detalle de Renglones / Servicios */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Servicio / Concepto</th>
                    <th className="p-3.5 w-20 text-center">Cant.</th>
                    <th className="p-3.5 w-28 text-right">Precio Unitario</th>
                    <th className="p-3.5 w-28 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(selectedFacturaForView.detalles || []).map((it: any, idx: number) => {
                    const cant = Number(it.cantidad) || 1;
                    const precio = Number(it.precioUnitario || it.precio) || 0;
                    const lineTotal = cant * precio;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{it.nombre || it.descripcion}</div>
                          {it.exento && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Exento IVA</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold">{cant}</td>
                        <td className="p-3.5 text-right font-mono">${precio.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold">${lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>Subtotal: <strong className="text-slate-800 dark:text-slate-200">${Number(selectedFacturaForView.subtotal || 0).toFixed(2)}</strong></div>
                <div>IVA ({Number(selectedFacturaForView.ivaPorcentaje || 16)}%): <strong className="text-slate-800 dark:text-slate-200">${Number(selectedFacturaForView.ivaMonto || 0).toFixed(2)}</strong></div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase">Total Comprobante</div>
                <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                  ${Number(selectedFacturaForView.total || 0).toFixed(2)}
                </div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Bs. {(Number(selectedFacturaForView.total || 0) * (Number(selectedFacturaForView.tasaCambio) || tasaOficial)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ============================================================================
  // CASO 1: VISTA RESUMEN MENSUAL AGRUPADO POR DÍAS (!selectedDate)
  // ============================================================================
  if (!selectedDate) {
    return (
      <div className="px-3 sm:px-6 pt-2 pb-6 max-w-7xl mx-auto animate-in fade-in duration-300 space-y-4">
        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 animate-bounce">
            <div className={`px-4 py-3 rounded-xl shadow-xl text-white font-semibold text-xs flex items-center gap-2 ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Barra Superior con Navegación y Selector de Mes */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <BackButton to="/" label="Volver al Inicio" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
            POS Facturación • Resumen Mensual por Días
          </span>
        </div>

        {/* HEADER PRINCIPAL (Diseño idéntico a Productos.tsx) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                Facturación & Punto de Venta
                <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full">
                  {monthKpis.totalComprobantes} en {formatMonthLabel(selectedMonth)}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Ventas y comprobantes agrupados por día para auditoría, consulta y control operativo
              </p>
            </div>
          </div>

          {/* CONTROLES DEL MES & BOTONES */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Navegación Mes Anterior / Siguiente */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Mes Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600" />
                <span>{formatMonthLabel(selectedMonth)}</span>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Mes Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Botón Exportar CSV */}
            <button
              onClick={handleExportMonthCSV}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Exportar ventas de este mes a CSV"
            >
              <Download size={14} className="text-emerald-600" />
              <span className="hidden sm:inline">Exportar Mes</span>
            </button>

            {/* Botón Caja Registradora (POS) Modal */}
            <button
              onClick={() => setIsPosModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ShoppingCart size={14} />
              <span>Caja Mostrador (Ventana)</span>
            </button>

            {/* Botón dedicado Móvil / Tablet Pantalla Completa */}
            <Link
              to="/caja-mostrador"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20"
              title="Abrir Caja Mostrador para Restaurante en pantalla completa optimizada para tablets y teléfonos"
            >
              <UtensilsCrossed size={14} />
              <span>Caja Restaurante (Tablet / Móvil)</span>
            </Link>

            {/* BOTÓN INTACTO: NUEVA FACTURA DE SERVICIO */}
            <button 
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> 
              <span>Nueva Factura de Servicios</span>
            </button>
          </div>
        </div>

        {/* TARJETAS DE KPIS DEL MES (Diseño idéntico a Productos.tsx) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ventas del Mes</span>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatMoney(monthKpis.totalVendido)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {monthKpis.totalComprobantes} comprobantes emitidos
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cobrado de Contado</span>
              <Check size={16} className="text-teal-600" />
            </div>
            <div className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
              {formatMoney(monthKpis.totalContado)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Efectivo, punto y transferencias
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Por Cobrar (Crédito)</span>
              <Calculator size={16} className="text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatMoney(monthKpis.totalCredito)}
            </div>
            <div className="text-[10px] text-amber-600 font-bold mt-0.5">
              Registrado en Cuentas por Cobrar
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-4 rounded-2xl text-white shadow-xs border border-emerald-900/50">
            <div className="flex items-center justify-between text-emerald-300 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Días con Venta</span>
              <CalendarDays size={16} className="text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white font-mono">
              {monthKpis.daysCount} días activos
            </div>
            <div className="text-[10px] text-emerald-200 font-medium mt-0.5">
              {monthKpis.totalServicios} servicios/ítems facturados
            </div>
          </div>
        </div>

        {/* TABLA DE RESUMEN DIARIO (AGRUPACIÓN POR DÍAS) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Días de Venta en {formatMonthLabel(selectedMonth)}
              </h2>
              <p className="text-[11px] text-slate-500">
                Selecciona cualquier fila para ingresar al detalle de facturas y servicios de esa fecha
              </p>
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl">
              {dailySummaries.length} {dailySummaries.length === 1 ? 'Día con actividad' : 'Días con actividad'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500 select-none">
                  <th className="py-3 px-4">Fecha & Día</th>
                  <th className="py-3 px-3 text-center">Comprobantes</th>
                  <th className="py-3 px-4 text-right">Facturas a Crédito ($)</th>
                  <th className="py-3 px-4 text-right">Facturas de Contado ($)</th>
                  <th className="py-3 px-4 text-right">Total Facturado ($)</th>
                  <th className="py-3 px-4 text-right">Total Facturado (Bs)</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                        <CalendarDays size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No hay ventas registradas en {formatMonthLabel(selectedMonth)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Puedes cambiar de mes con los botones superiores o emitir una nueva factura de servicios.
                      </p>
                      <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="mt-3.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Nueva Factura de Servicios</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((day) => {
                    const { dayOfWeek, formatted } = formatDayDetails(day.fecha);
                    const totalVes = day.totalVendido * tasaOficial;

                    return (
                      <tr 
                        key={day.fecha}
                        onClick={() => setSelectedDate(day.fecha)}
                        className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                      >
                        {/* Fecha y Día */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex flex-col items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 font-mono font-black shadow-2xs">
                              <span className="text-[9px] uppercase tracking-tighter leading-none opacity-80">
                                {dayOfWeek.slice(0, 3)}
                              </span>
                              <span className="text-sm leading-none mt-0.5 font-extrabold">
                                {day.fecha.split('-')[2]}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                {dayOfWeek}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {formatted}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Comprobantes */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShoppingCart size={12} />
                            <span>{day.count} {day.count === 1 ? 'venta' : 'ventas'}</span>
                          </span>
                        </td>

                        {/* Facturas a Crédito ($) */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          ${day.totalCredito.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Facturas de Contado ($) */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                          ${day.totalContado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Total Facturado ($) */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white font-black text-sm">
                          ${day.totalVendido.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Total Facturado (Bs) */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-700 dark:text-slate-300 text-xs">
                          Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Botón Ver Detalle */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDate(day.fecha)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer mx-auto"
                            title={`Ver ventas del ${day.fecha}`}
                          >
                            <span>Ver Detalle ({day.count})</span>
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Emisión de Facturas de Servicios (INTACTO) */}
        <ServiceInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onInvoiceCreated={(nuevaFactura) => {
            loadFacturas();
            setSelectedFacturaForPrint(nuevaFactura);
            setIsPrintOpen(true);
          }}
          contactos={contactos}
          servicios={servicios}
          bancos={bancos}
          cuentasContables={allCuentas.length > 0 ? allCuentas : cuentasContables}
          configContable={configContable}
          empresa={activeCompany}
          showToast={showToast}
          onSave={onSave}
          reloadCxc={reloadCxc}
          reloadComprobantes={reloadComprobantes}
        />

        {/* Modal de Caja Registradora Mostrador (POS) */}
        {isPosModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-3xl p-4 flex flex-col shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  Caja Registradora / Punto de Venta
                </h3>
                <button 
                  onClick={() => setIsPosModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden pt-2">
                <PosCashRegister
                  servicios={servicios}
                  contactos={contactos}
                  bancos={bancos}
                  cuentasContables={allCuentas.length > 0 ? allCuentas : cuentasContables}
                  configContable={configContable}
                  empresa={activeCompany}
                  onSave={onSave}
                  reloadCxc={reloadCxc}
                  reloadComprobantes={reloadComprobantes}
                  onSaleCompleted={() => {
                    loadFacturas();
                    if (reloadCxc) reloadCxc();
                    if (reloadComprobantes) reloadComprobantes();
                  }}
                  showToast={showToast}
                />
              </div>
            </div>
          </div>
        )}

        {/* Vista Previa de Impresión */}
        {selectedFacturaForPrint && (
          <PrintPreview
            isOpen={isPrintOpen}
            onClose={() => setIsPrintOpen(false)}
            title={`Comprobante #${selectedFacturaForPrint.numero}`}
            empresaData={activeCompany}
          >
            <PosTicketPrint factura={selectedFacturaForPrint} empresa={activeCompany} />
          </PrintPreview>
        )}

        {renderSharedModals()}
      </div>
    );
  }

  // ============================================================================
  // CASO 2: VISTA DETALLE DE UN DÍA SELECCIONADO (selectedDate)
  // ============================================================================
  const dayFormatted = formatDayDetails(selectedDate);

  return (
    <div className="px-3 sm:px-6 pt-2 pb-6 max-w-7xl mx-auto animate-in fade-in duration-300 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-xl text-white font-semibold text-xs flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Barra Superior con Botón de Regreso y Título del Día */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedDate(null);
              setSearchTerm('');
            }}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            title={`Volver a Días de ${formatMonthLabel(selectedMonth)}`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {dayFormatted.dayOfWeek}
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {dayFormatted.full}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Auditoría y detalle de las ventas y comprobantes registrados en este día ({dayFacturas.length} comprobantes)
            </p>
          </div>
        </div>

        {/* Acciones de la Vista Detalle (INCLUYE BOTÓN INTACTO) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPosModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <ShoppingCart size={14} />
            <span>Caja Mostrador (Ventana)</span>
          </button>

          <Link
            to="/caja-mostrador"
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-amber-500/20"
            title="Abrir Caja Mostrador para Restaurante en pantalla completa optimizada para tablets y teléfonos"
          >
            <UtensilsCrossed size={14} />
            <span>Caja Restaurante (Tablet / Móvil)</span>
          </Link>

          <button 
            onClick={() => setIsInvoiceModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 
            <span>Nueva Factura de Servicios</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI del Día Seleccionado */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ventas del Día</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatMoney(dayKpis.totalVendido)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{dayKpis.count} comprobantes</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total en Bolívares</span>
            <Calculator size={16} className="text-teal-600" />
          </div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {formatMoney(dayKpis.totalVendido * tasaOficial, 'VES')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tasa: Bs. {tasaOficial.toFixed(2)}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cobrado de Contado</span>
            <Check size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatMoney(dayKpis.totalContado)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Efectivo / Bancos</div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-4 rounded-2xl text-white shadow-xs border border-emerald-900/50">
          <div className="flex items-center justify-between text-emerald-300 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Comprobantes</span>
            <Store size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white font-mono">
            {dayKpis.count}
          </div>
          <div className="text-[10px] text-emerald-200 font-medium mt-0.5">Operaciones cerradas hoy</div>
        </div>
      </div>

      {/* Buscador y Tabla del Día */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por N° Factura, Cliente o RIF en este día..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-emerald-500 bg-white dark:bg-slate-800 shadow-2xs"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Mostrando {filteredDayFacturas.length} de {dayFacturas.length} registros del día
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 w-36">N° Comprobante</th>
                <th className="px-5 py-3.5">Cliente Receptor</th>
                <th className="px-5 py-3.5">Detalle / Servicios</th>
                <th className="px-5 py-3.5">Método de Pago</th>
                <th className="px-5 py-3.5 w-32 text-right">Total ($)</th>
                <th className="px-5 py-3.5 w-32 text-right">Total (Bs)</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 w-36 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDayFacturas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center bg-white dark:bg-slate-900">
                    <Store className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No se encontraron ventas para este día con ese criterio</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Intenta con otro término de búsqueda o limpia el filtro.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDayFacturas.map((f, idx) => {
                  const totalUsd = Number(f.total) || 0;
                  const totalVes = totalUsd * (Number(f.tasaCambio) || tasaOficial);
                  const detalles = Array.isArray(f.detalles) ? f.detalles : [];

                  return (
                    <tr key={f.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 align-middle">
                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {f.numero}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block uppercase ${
                          f.tipoDocumento === 'ticket_pos'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {f.tipoDocumento === 'ticket_pos' ? 'Ticket POS' : 'Factura Serv.'}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {f.clienteNombre || 'Consumidor Final'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {f.clienteRif || 'V-00000000'}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {detalles.length > 0 ? detalles[0].nombre || detalles[0].descripcion : 'Servicios Generales'}
                        </div>
                        {detalles.length > 1 && (
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            +{detalles.length - 1} concepto(s) adicional(es)
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 align-middle">
                        <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {f.metodoPago || 'Efectivo'}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle text-right">
                        <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          ${totalUsd.toFixed(2)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-right">
                        <div className="font-mono font-semibold text-slate-600 dark:text-slate-300 text-xs">
                          Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-middle text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.estado === 'Cobrada'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : f.estado === 'Pendiente'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {f.estado}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedFacturaForView(f)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedFacturaForPrint(f);
                              setIsPrintOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 transition-colors"
                            title="Imprimir ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {f.estado !== 'Anulada' && (
                            <button
                              onClick={() => handleAnular(f.id, f.numero)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-600 transition-colors"
                              title="Anular comprobante"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Emisión de Facturas de Servicios (INTACTO) */}
      <ServiceInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onInvoiceCreated={(nuevaFactura) => {
          loadFacturas();
          setSelectedFacturaForPrint(nuevaFactura);
          setIsPrintOpen(true);
        }}
        contactos={contactos}
        servicios={servicios}
        bancos={bancos}
        cuentasContables={allCuentas.length > 0 ? allCuentas : cuentasContables}
        configContable={configContable}
        empresa={activeCompany}
        showToast={showToast}
        onSave={onSave}
        reloadCxc={reloadCxc}
        reloadComprobantes={reloadComprobantes}
      />

      {/* Modal de Caja Mostrador */}
      {isPosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-3xl p-4 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Caja Registradora / Punto de Venta
              </h3>
              <button 
                onClick={() => setIsPosModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden pt-2">
              <PosCashRegister
                servicios={servicios}
                contactos={contactos}
                bancos={bancos}
                cuentasContables={allCuentas.length > 0 ? allCuentas : cuentasContables}
                configContable={configContable}
                empresa={activeCompany}
                onSave={onSave}
                reloadCxc={reloadCxc}
                reloadComprobantes={reloadComprobantes}
                onSaleCompleted={() => {
                  loadFacturas();
                  if (reloadCxc) reloadCxc();
                  if (reloadComprobantes) reloadComprobantes();
                }}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa de Impresión */}
      {selectedFacturaForPrint && (
        <PrintPreview
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          title={`Comprobante #${selectedFacturaForPrint.numero}`}
          empresaData={activeCompany}
        >
          <PosTicketPrint factura={selectedFacturaForPrint} empresa={activeCompany} />
        </PrintPreview>
      )}

      {renderSharedModals()}
    </div>
  );
}
