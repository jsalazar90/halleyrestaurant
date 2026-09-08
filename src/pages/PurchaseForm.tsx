import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, Send, ShoppingCart, FileText, Building2, DollarSign, ArrowLeft, Search, X, 
  User, Briefcase, Plus, MapPin, Mail, Phone, BookOpen, Check, AlertCircle, Trash2,
  Calendar, CreditCard, Layers, Tag, ShieldCheck, CheckCircle2, ChevronRight, Hash,
  HelpCircle, RefreshCw, Landmark, Calculator, Receipt, Percent
} from 'lucide-react';
import CuentaContableModal from '../components/common/CuentaContableModal';
import BackButton from '../components/common/BackButton';

interface PurchaseItem {
  id: string;
  concepto: string;
  descripcion?: string;
  cantidad: number;
  costoUnitario: number;
  exento: boolean;
  alicuotaIva: number; // 16, 8, 31, 0
}

interface PurchaseFormProps {
  contactos?: any[];
  cuentasContables?: any[];
  bancos?: any[];
  servicios?: any[];
  onSave?: any;
  showToast?: any;
  configContable?: any;
  workingYear?: string;
}

export default function PurchaseForm({ 
  contactos = [], 
  cuentasContables = [], 
  bancos = [],
  servicios = [],
  onSave, 
  showToast, 
  configContable, 
  workingYear 
}: PurchaseFormProps) {
  const navigate = useNavigate();

  // Modo de ingreso: 'renglones' (Detallado estilo Administrativo) vs 'global' (Gasto Rápido)
  const [entryMode, setEntryMode] = useState<'renglones' | 'global'>('renglones');

  // Datos del Documento Mercantil
  const [documentType, setDocumentType] = useState('Factura de Compra');
  const [controlNumber, setControlNumber] = useState('00-');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseDestination, setPurchaseDestination] = useState<'expense' | 'inventory'>('expense');

  // Moneda y Tasa de Cambio
  const [currency, setCurrency] = useState<'USD' | 'VES' | 'EUR'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const primerBancoVES = bancos.find(b => {
      const mon = (b.moneda || '').toLowerCase();
      return (mon === 'ves' || mon === 'bs' || mon === 'bs.') && Number(b.tasa) > 1;
    });
    return primerBancoVES ? Number(primerBancoVES.tasa) : 36.50;
  });

  // Condición de Pago Comercial
  const [paymentCondition, setPaymentCondition] = useState<'credito' | 'contado'>('credito');
  const [creditDays, setCreditDays] = useState<number>(15);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  
  // Datos de Contado (si aplica)
  const [selectedBankId, setSelectedBankId] = useState<string>(bancos[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentReference, setPaymentReference] = useState('');

  const selectedBank = useMemo(() => {
    return bancos.find(b => String(b.id) === String(selectedBankId));
  }, [bancos, selectedBankId]);

  // Actualizar fecha de vencimiento al cambiar días o fecha
  useEffect(() => {
    if (paymentCondition === 'credito') {
      const d = new Date(date || new Date().toISOString().split('T')[0]);
      d.setDate(d.getDate() + Number(creditDays || 0));
      setDueDate(d.toISOString().split('T')[0]);
    } else {
      setDueDate(date);
    }
  }, [creditDays, date, paymentCondition]);

  // Datos del Proveedor
  const [supplierName, setSupplierName] = useState('');
  const [supplierRif, setSupplierRif] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [selectedSupplierObj, setSelectedSupplierObj] = useState<any>(null);

  // Modal de Proveedor
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

  // Nuevo Proveedor
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierRif, setNewSupplierRif] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierIsCompany, setNewSupplierIsCompany] = useState(true);

  // Renglones de la Compra (Modo Administrativo)
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: 'it-1',
      concepto: '',
      descripcion: '',
      cantidad: 1,
      costoUnitario: 0,
      exento: false,
      alicuotaIva: 16
    }
  ]);

  // Modo Global / Gasto Rápido
  const [globalDescription, setGlobalDescription] = useState('');
  const [globalMontoExento, setGlobalMontoExento] = useState('');
  const [globalBaseImponible, setGlobalBaseImponible] = useState('');
  const [globalTaxType, setGlobalTaxType] = useState('G'); // G=16%, R=8%, A=31%

  // Retenciones SENIAT & Impuestos
  const [applyRetentions, setApplyRetentions] = useState(false);
  const [retentionIvaPercent, setRetentionIvaPercent] = useState<number>(75);
  const [retentionIslrPercent, setRetentionIslrPercent] = useState<number>(2);
  const [applyIGTF, setApplyIGTF] = useState(false);

  // Modal Asiento Contable
  const [pendingVoucher, setPendingVoucher] = useState<{
    comprobante: any;
    cxpDoc: any;
    bankMovement?: any;
    onConfirm: (finalComprobante: any) => Promise<void>;
  } | null>(null);

  const [showAccountSelectorModal, setShowAccountSelectorModal] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(null);

  // Filtrar lista de proveedores
  const filteredSuppliers = useMemo(() => {
    const term = (supplierSearchTerm || '').toLowerCase().trim();
    return contactos.filter(c => 
      (c.type === 'supplier' || c.type === 'both' || c.type === 'intercompany' || c.type === 'shareholder') && 
      ((c.taxId || '').toLowerCase().includes(term) || 
       (c.name || '').toLowerCase().includes(term))
    );
  }, [contactos, supplierSearchTerm]);

  const handleSelectSupplier = (supplier: any) => {
    setSelectedSupplierObj(supplier);
    setSupplierRif(supplier.taxId || '');
    setSupplierName(supplier.name || '');
    setSupplierAddress(supplier.address || '');
    setIsSupplierModalOpen(false);
    setSupplierSearchTerm('');
  };

  const handleClearSupplier = () => {
    setSelectedSupplierObj(null);
    setSupplierRif('');
    setSupplierName('');
    setSupplierAddress('');
  };

  const handleSaveNewSupplier = () => {
    if (!newSupplierName || !newSupplierRif) {
      if (showToast) showToast('El nombre y RIF son obligatorios', 'error');
      return;
    }

    const newContact = {
      id: `ct_${Date.now()}`,
      name: newSupplierName,
      type: 'supplier',
      taxId: newSupplierRif,
      email: newSupplierEmail,
      phone: newSupplierPhone,
      address: newSupplierAddress,
      isCompany: newSupplierIsCompany,
      creditAccount: '2.1.01.01',
      expenseAccount: '5.1.01.01'
    };

    if (onSave) {
      onSave('contactos', newContact);
    }

    handleSelectSupplier(newContact);
    setIsAddingSupplier(false);
    
    setNewSupplierName('');
    setNewSupplierRif('');
    setNewSupplierAddress('');
    setNewSupplierEmail('');
    setNewSupplierPhone('');
    setNewSupplierIsCompany(true);
  };

  // Manejadores de Renglones
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        concepto: '',
        descripcion: '',
        cantidad: 1,
        costoUnitario: 0,
        exento: false,
        alicuotaIva: 16
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([{
        id: `it-${Date.now()}`,
        concepto: '',
        descripcion: '',
        cantidad: 1,
        costoUnitario: 0,
        exento: false,
        alicuotaIva: 16
      }]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Cálculo de Totales
  const totals = useMemo(() => {
    let exento = 0;
    let base = 0;
    let iva = 0;

    if (entryMode === 'renglones') {
      items.forEach(item => {
        const qty = Number(item.cantidad) || 0;
        const cost = Number(item.costoUnitario) || 0;
        const lineTotal = qty * cost;

        if (item.exento) {
          exento += lineTotal;
        } else {
          base += lineTotal;
          const rate = (Number(item.alicuotaIva) || 16) / 100;
          iva += lineTotal * rate;
        }
      });
    } else {
      exento = Number(globalMontoExento) || 0;
      base = Number(globalBaseImponible) || 0;
      const rate = globalTaxType === 'G' ? 0.16 : globalTaxType === 'R' ? 0.08 : 0.31;
      iva = base * rate;
    }

    const subtotal = exento + base;
    const igtf = applyIGTF && currency === 'USD' ? (subtotal + iva) * 0.03 : 0;
    
    let retencionIva = 0;
    let retencionIslr = 0;

    if (applyRetentions) {
      retencionIva = iva * (retentionIvaPercent / 100);
      retencionIslr = base * (retentionIslrPercent / 100);
    }

    const total = Math.max(0, subtotal + iva + igtf - retencionIva - retencionIslr);

    return { 
      exento: Math.round(exento * 100) / 100, 
      base: Math.round(base * 100) / 100, 
      iva: Math.round(iva * 100) / 100, 
      subtotal: Math.round(subtotal * 100) / 100, 
      igtf: Math.round(igtf * 100) / 100, 
      retencionIva: Math.round(retencionIva * 100) / 100, 
      retencionIslr: Math.round(retencionIslr * 100) / 100, 
      total: Math.round(total * 100) / 100 
    };
  }, [
    entryMode, 
    items, 
    globalMontoExento, 
    globalBaseImponible, 
    globalTaxType, 
    applyIGTF, 
    currency, 
    applyRetentions, 
    retentionIvaPercent, 
    retentionIslrPercent
  ]);

  const formatMoney = (amount: number, curr: string = currency) => {
    const n = Number(amount);
    if (isNaN(n) || amount === null) return "0,00";
    let str = n.toFixed(2);
    let parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const formatted = parts.join(',');
    return curr === 'VES' ? `Bs. ${formatted}` : curr === 'EUR' ? `€ ${formatted}` : `$ ${formatted}`;
  };

  // Proceso de Registro & Contabilización
  const handleSave = async () => {
    if (workingYear && date) {
      const year = date.substring(0, 4);
      if (year !== workingYear) {
        showToast?.(`No se puede registrar esta compra porque el año seleccionado en la fecha (${year}) no coincide con el período contable activo (${workingYear}).`, 'error');
        return;
      }
    }

    if (!supplierName || !supplierRif) {
      showToast?.('Debe seleccionar o registrar los datos del Proveedor.', 'error');
      return;
    }

    if (!invoiceNumber.trim() || !controlNumber.trim()) {
      showToast?.('Por favor ingrese el Nro. de Factura y el Nro. de Control del documento.', 'error');
      return;
    }

    if (entryMode === 'renglones') {
      const hasValidItems = items.some(it => (it.concepto || it.descripcion) && Number(it.costoUnitario) > 0);
      if (!hasValidItems) {
        showToast?.('Debe ingresar al menos un renglón con concepto y costo unitario mayor a cero.', 'error');
        return;
      }
    } else {
      if (!globalDescription.trim()) {
        showToast?.('Ingrese el Concepto / Descripción general del gasto.', 'error');
        return;
      }
      if (totals.total <= 0) {
        showToast?.('Debe indicar un monto exento o base imponible mayor a cero.', 'error');
        return;
      }
    }

    if (paymentCondition === 'contado' && !selectedBankId) {
      showToast?.('Seleccione la Caja o Banco receptor del pago para la compra de contado.', 'error');
      return;
    }

    const timestamp = Date.now();
    const rate = currency === 'VES' && exchangeRate > 0 ? exchangeRate : (exchangeRate || 1);
    
    // Montos en USD para la contabilidad multi-moneda
    const exentoUsd = currency === 'VES' ? totals.exento / rate : totals.exento;
    const baseUsd = currency === 'VES' ? totals.base / rate : totals.base;
    const gastoTotalUsd = exentoUsd + baseUsd;
    const ivaUsd = currency === 'VES' ? totals.iva / rate : totals.iva;
    const igtfUsd = currency === 'VES' ? totals.igtf / rate : totals.igtf;
    const retencionIvaUsd = currency === 'VES' ? totals.retencionIva / rate : totals.retencionIva;
    const retencionIslrUsd = currency === 'VES' ? totals.retencionIslr / rate : totals.retencionIslr;
    const totalNetoUsd = currency === 'VES' ? totals.total / rate : totals.total;

    // Buscar cuentas del proveedor
    const supplier = selectedSupplierObj || contactos?.find(c => c.taxId === supplierRif || (c.name || '').toLowerCase() === (supplierName || '').toLowerCase());
    const supplierAccount = supplier?.creditAccount || supplier?.credit_account || configContable?.cuentaCxp || '2.1.01.01';
    const debitAccount = supplier?.expenseAccount || supplier?.expense_account || supplier?.debitAccount || supplier?.debit_account || configContable?.cuentaGastos || '5.1.01.01';
    
    const conceptoGeneral = entryMode === 'renglones' 
      ? (items[0]?.concepto ? `${items[0].concepto}${items.length > 1 ? ` (+${items.length - 1} ítems)` : ''}` : `Compra de Factura ${invoiceNumber}`)
      : globalDescription;

    const ctaCreditoFiscal = configContable?.cuentaCreditoFiscal || configContable?.cuentaIvaCredito || '1.1.08.01';
    const ctaIvaRetenido = configContable?.cuentaIvaRetenidoCompras || configContable?.cuentaIvaRetenido || '2.1.04.01';
    const ctaIslrRetenido = configContable?.cuentaIslrRetenidoCompras || configContable?.cuentaIslrRetenido || '2.1.04.02';
    const ctaGastoIgtf = configContable?.cuentaGastos || '5.1.01.01';
    const ctaBancoEgreso = selectedBank?.cuenta_contable_id || '1.1.02.01';

    // Construir líneas de asiento contable
    const lineas = [
      {
        id: `l1-${timestamp}`,
        cuentaId: debitAccount,
        descripcion: `Compra/Gasto Fact ${invoiceNumber} - ${supplierName} (${conceptoGeneral})`,
        debe: Math.round(gastoTotalUsd * 100) / 100,
        haber: 0
      },
      ...(ivaUsd > 0 ? [{
        id: `l2-${timestamp}`,
        cuentaId: ctaCreditoFiscal,
        descripcion: `Crédito Fiscal IVA - Fact ${invoiceNumber}`,
        debe: Math.round(ivaUsd * 100) / 100,
        haber: 0
      }] : []),
      ...(igtfUsd > 0 ? [{
        id: `l3-${timestamp}`,
        cuentaId: ctaGastoIgtf,
        descripcion: `Gasto Impuesto IGTF 3% - Fact ${invoiceNumber}`,
        debe: Math.round(igtfUsd * 100) / 100,
        haber: 0
      }] : []),
      ...(retencionIvaUsd > 0 ? [{
        id: `l4-${timestamp}`,
        cuentaId: ctaIvaRetenido,
        descripcion: `Retención IVA Compras (${retentionIvaPercent}%) - ${supplierName}`,
        debe: 0,
        haber: Math.round(retencionIvaUsd * 100) / 100
      }] : []),
      ...(retencionIslrUsd > 0 ? [{
        id: `l5-${timestamp}`,
        cuentaId: ctaIslrRetenido,
        descripcion: `Retención ISLR Compras (${retentionIslrPercent}%) - ${supplierName}`,
        debe: 0,
        haber: Math.round(retencionIslrUsd * 100) / 100
      }] : []),
      {
        id: `l6-${timestamp}`,
        cuentaId: paymentCondition === 'contado' ? ctaBancoEgreso : supplierAccount,
        descripcion: paymentCondition === 'contado' 
          ? `Egreso ${selectedBank?.banco || 'Caja/Banco'} - Pago Fact ${invoiceNumber}` 
          : `CxP ${supplierName} - Fact ${invoiceNumber}`,
        debe: 0,
        haber: Math.round(totalNetoUsd * 100) / 100
      }
    ];

    const totalDebe = lineas.reduce((s, l) => s + (Number(l.debe) || 0), 0);
    const totalHaber = lineas.reduce((s, l) => s + (Number(l.haber) || 0), 0);
    const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

    const comprobanteInicial = {
      id: `comp-com-${timestamp}`,
      fecha: date,
      numero: `CMP-${timestamp.toString().slice(-6)}`,
      tipo: 'Diario',
      descripcion: `Factura Compra ${invoiceNumber} - ${supplierName}`,
      referencia: `${documentType === 'Factura de Compra' ? 'FAC-COM' : 'ND'}-${invoiceNumber}`,
      total: Math.max(totalDebe, totalHaber),
      estado: isBalanced ? 'Contabilizado' : 'Descuadrado',
      lineas: lineas
    };

    const newCxp = {
      id: `cxp-${timestamp}`,
      categoria: 'proveedores',
      proveedor: supplierName,
      proveedor_id: supplier?.id || supplierRif,
      factura_id: `${documentType === 'Factura de Compra' ? 'FAC-COM' : 'ND'}-${invoiceNumber}`,
      numero_control: controlNumber,
      fecha: date,
      vencimiento: paymentCondition === 'credito' ? dueDate : date,
      descripcion: conceptoGeneral,
      tipo: 'factura',
      condicion_pago: paymentCondition,
      banco_id: paymentCondition === 'contado' ? selectedBankId : undefined,
      monedaOriginal: currency,
      tasaCambio: rate,
      totalOriginal: totals.total,
      baseImponibleOriginal: totals.base,
      ivaOriginal: totals.iva,
      total: Math.round(totalNetoUsd * 100) / 100,
      saldo: paymentCondition === 'credito' ? Math.round(totalNetoUsd * 100) / 100 : 0,
      retencionIva: Math.round(retencionIvaUsd * 100) / 100,
      retencionIslr: Math.round(retencionIslrUsd * 100) / 100,
      baseImponible: Math.round(baseUsd * 100) / 100,
      iva: Math.round(ivaUsd * 100) / 100,
      moneda: 'USD',
      tasa: 1,
      estado: paymentCondition === 'credito' ? 'pendiente' : 'pagada',
      items: entryMode === 'renglones' ? items : undefined
    };

    const bankMovement = (paymentCondition === 'contado' && selectedBank) ? {
      id: `mov-banco-${timestamp}`,
      banco_id: selectedBank.id,
      banco: selectedBank.banco || selectedBank.nombre,
      fecha: date,
      ref: paymentReference || `FAC-${invoiceNumber}`,
      descripcion: `Pago de Contado Compra ${invoiceNumber} - ${supplierName}`,
      tipo: 'egreso',
      monto: Math.round(totalNetoUsd * 100) / 100,
      tasa: rate,
      estado: 'activo'
    } : null;

    setPendingVoucher({
      comprobante: comprobanteInicial,
      cxpDoc: newCxp,
      bankMovement,
      onConfirm: async (finalComprobante) => {
        if (onSave) {
          if (finalComprobante.descripcion) {
            newCxp.descripcion = finalComprobante.descripcion;
            if (bankMovement) {
              bankMovement.descripcion = finalComprobante.descripcion;
            }
          }
          await onSave('cxp', newCxp);
          await onSave('comprobantes', finalComprobante);
          if (bankMovement) {
            await onSave('movimientosBancos', bankMovement);
          }
        }

        if (showToast) {
          showToast(`Compra ${invoiceNumber} de ${supplierName} registrada exitosamente`, 'success');
        }

        setPendingVoucher(null);
        navigate('/payables');
      }
    });
  };

  return (
    <div className="px-3 sm:px-6 pt-1 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Botón de Regreso y Migas de Pan */}
      <div className="mb-3 flex items-center justify-between">
        <BackButton to="/payables" label="Volver a Cuentas por Pagar" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sistema Administrativo
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
            {workingYear || new Date().getFullYear()}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-100/60 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* BANNER COMERCIAL & ACCIONES PRINCIPALES                                  */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Facturación de Compras y Gastos
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Fiscal SENIAT
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Emisión de comprobante de compra, control de retenciones y contabilización automática
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Selector de Modo Renglones vs Global */}
            <div className="bg-slate-800/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setEntryMode('renglones')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  entryMode === 'renglones'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Renglones
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('global')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  entryMode === 'global'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Gasto Global
              </button>
            </div>

            <button 
              type="button"
              onClick={handleSave}
              className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-98"
            >
              <Send size={16} />
              <span>Contabilizar Compra</span>
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          
          {/* ========================================================================= */}
          {/* BLOQUE 1: DATOS FISCALES DEL DOCUMENTO & CONDICIONES COMERCIALES        */}
          {/* ========================================================================= */}
          <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                1. Datos del Documento y Condiciones de Pago
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">Destino Contable:</span>
                <select 
                  value={purchaseDestination}
                  onChange={(e) => setPurchaseDestination(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="expense">Gasto Operativo / Servicios</option>
                  <option value="inventory">Costo de Ventas / Inventario</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {/* Tipo de Documento */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Tipo Doc.
                </label>
                <select 
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="Factura de Compra">Factura de Compra</option>
                  <option value="Nota de Débito">Nota de Débito</option>
                  <option value="Nota de Crédito">Nota de Crédito</option>
                  <option value="Orden de Compra">Orden de Compra / Recibo</option>
                </select>
              </div>

              {/* Nro. Factura */}
              <div className="col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Nro. Factura *
                </label>
                <input 
                  type="text" 
                  placeholder="00012345"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Nro. Control SENIAT */}
              <div className="col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Nro. Control SENIAT *
                </label>
                <input 
                  type="text" 
                  placeholder="00-0001234"
                  value={controlNumber}
                  onChange={(e) => setControlNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Fecha Emisión */}
              <div className="col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Fecha Emisión
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Moneda */}
              <div className="col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Moneda
                </label>
                <select 
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                >
                  <option value="USD">Dólares (USD $)</option>
                  <option value="VES">Bolívares (VES Bs)</option>
                  <option value="EUR">Euros (EUR €)</option>
                </select>
              </div>

              {/* Tasa de Cambio */}
              <div className="col-span-1">
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                  Tasa Oficial (Bs)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-emerald-800 focus:ring-2 focus:ring-indigo-500 outline-none pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    Bs
                  </span>
                </div>
              </div>
            </div>

            {/* Condición de Pago: A Crédito vs De Contado */}
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">Término:</span>
                <div className="inline-flex rounded-xl bg-slate-200/80 p-1 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => setPaymentCondition('credito')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      paymentCondition === 'credito'
                        ? 'bg-white text-amber-900 shadow-xs border border-amber-300/50'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A Crédito (CxP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCondition('contado')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      paymentCondition === 'contado'
                        ? 'bg-white text-emerald-900 shadow-xs border border-emerald-300/50'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    De Contado (Pagada)
                  </button>
                </div>
              </div>

              {paymentCondition === 'credito' ? (
                <div className="md:col-span-8 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Días Crédito:</span>
                    <input 
                      type="number"
                      min="1"
                      value={creditDays}
                      onChange={(e) => setCreditDays(Number(e.target.value))}
                      className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Fecha Vence:</span>
                    <input 
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    Se creará una obligación en Cuentas por Pagar.
                  </span>
                </div>
              ) : (
                <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {bancos.length > 0 ? (
                        bancos.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.banco || b.nombre} ({b.moneda || 'USD'})
                          </option>
                        ))
                      ) : (
                        <option value="">Caja Principal (USD)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo Divisas ($)</option>
                      <option value="pago_movil">Pago Móvil</option>
                      <option value="zelle">Zelle / Divisas</option>
                      <option value="punto">Tarjeta / Punto de Venta</option>
                    </select>
                  </div>
                  <div>
                    <input 
                      type="text"
                      placeholder="Nro. Referencia pago..."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BLOQUE 2: FICHA COMERCIAL DEL PROVEEDOR (ESTILO ERP)                     */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                2. Ficha del Proveedor
              </h3>
              <div className="flex items-center gap-2">
                {supplierName && (
                  <button
                    type="button"
                    onClick={handleClearSupplier}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline"
                  >
                    Cambiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingSupplier(false);
                    setIsSupplierModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200"
                >
                  <Search size={14} />
                  {supplierName ? 'Buscar Otro Proveedor' : 'Seleccionar Proveedor'}
                </button>
              </div>
            </div>

            {supplierName ? (
              <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200 shrink-0">
                    {supplierRif.startsWith('J') || supplierRif.startsWith('G') ? <Building2 size={22} /> : <User size={22} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{supplierName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {supplierRif}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {supplierAddress || 'Sin dirección registrada'}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-indigo-100 sm:pl-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Cuenta CxP Asociada
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {selectedSupplierObj?.creditAccount || configContable?.cuentaCxp || '2.1.01.01 (Proveedores)'}
                  </span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setIsSupplierModalOpen(true)}
                className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center mb-2 transition-colors">
                  <Search size={18} />
                </div>
                <p className="text-xs font-bold text-slate-700">Ningún proveedor seleccionado</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Haz clic aquí para buscar en el directorio o registrar un nuevo proveedor</p>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* BLOQUE 3: DETALLE DE LA COMPRA / RENGLONES O GASTO GLOBAL                 */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  3. Detalle de la Compra / Renglones de Factura
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {entryMode === 'renglones' 
                    ? 'Especifique los conceptos, cantidades y costos unitarios de cada renglón comercial'
                    : 'Indique el monto consolidado de base imponible y exento de la factura'}
                </p>
              </div>

              {entryMode === 'renglones' && (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Agregar Renglón</span>
                </button>
              )}
            </div>

            {/* VISTA 1: TABLA DE RENGLONES ADMINISTRATIVOS */}
            {entryMode === 'renglones' ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3">Concepto / Ítem / Descripción del Servicio</th>
                        <th className="py-3 px-3 w-24 text-center">Cantidad</th>
                        <th className="py-3 px-3 w-32 text-right">Costo Unit. ($)</th>
                        <th className="py-3 px-3 w-20 text-center">Exento</th>
                        <th className="py-3 px-3 w-28 text-center">IVA %</th>
                        <th className="py-3 px-3 w-32 text-right">Total Renglón ($)</th>
                        <th className="py-3 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {items.map((item, idx) => {
                        const lineSubtotal = (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="text"
                                placeholder="Ej: Honorarios contables, Mantenimiento de servidores, Alquiler de local..."
                                value={item.concepto}
                                onChange={(e) => handleUpdateItem(idx, 'concepto', e.target.value)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 transition-all"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="number"
                                min="1"
                                step="1"
                                value={item.cantidad}
                                onChange={(e) => handleUpdateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.costoUnitario !== undefined && item.costoUnitario !== 0 ? item.costoUnitario : ''}
                                onChange={(e) => handleUpdateItem(idx, 'costoUnitario', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-right outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={Boolean(item.exento)}
                                onChange={(e) => handleUpdateItem(idx, 'exento', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.exento ? (
                                <span className="text-[10px] font-bold text-slate-400 uppercase">0% (E)</span>
                              ) : (
                                <select
                                  value={item.alicuotaIva}
                                  onChange={(e) => handleUpdateItem(idx, 'alicuotaIva', Number(e.target.value))}
                                  className="bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-700 outline-none"
                                >
                                  <option value={16}>16% (G)</option>
                                  <option value={8}>8% (R)</option>
                                  <option value={31}>31% (A)</option>
                                </select>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                              ${lineSubtotal.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Eliminar renglón"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* VISTA 2: INGRESO GLOBAL / GASTO RÁPIDO */
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                    Concepto / Descripción General del Gasto *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Servicios de internet corporativo, Reparación y mantenimiento, Suministros..."
                    value={globalDescription}
                    onChange={(e) => setGlobalDescription(e.target.value)}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Monto Exento (E)
                    </label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={globalMontoExento}
                      onChange={(e) => setGlobalMontoExento(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-right outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Base Imponible Gravable
                    </label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={globalBaseImponible}
                      onChange={(e) => setGlobalBaseImponible(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-right outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                      Alícuota IVA
                    </label>
                    <select 
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      value={globalTaxType}
                      onChange={(e) => setGlobalTaxType(e.target.value)}
                    >
                      <option value="G">General (16%)</option>
                      <option value="R">Reducida (8%)</option>
                      <option value="A">Adicional (31%)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* BLOQUE 4: RETENCIONES SENIAT (IVA / ISLR) & IGTF                          */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Retenciones de Impuestos */}
            <div className="md:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Retenciones Fiscales (SENIAT)
                  </h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={applyRetentions}
                    onChange={(e) => setApplyRetentions(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {applyRetentions ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-emerald-900">
                        Retención IVA (%)
                      </label>
                      <select
                        value={retentionIvaPercent}
                        onChange={(e) => setRetentionIvaPercent(Number(e.target.value))}
                        className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-xs font-bold text-emerald-800"
                      >
                        <option value={75}>75% Ordinario</option>
                        <option value={100}>100% Especial</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                      <span className="text-slate-500 font-semibold">Monto Retenido:</span>
                      <span className="font-mono font-black text-rose-700">
                        -{formatMoney(totals.retencionIva)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-emerald-900">
                        Retención ISLR (%)
                      </label>
                      <div className="flex items-center gap-1">
                        <select
                          value={retentionIslrPercent}
                          onChange={(e) => setRetentionIslrPercent(Number(e.target.value))}
                          className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-xs font-bold text-emerald-800"
                        >
                          <option value={1}>1% (Bienes)</option>
                          <option value={2}>2% (Servicios)</option>
                          <option value={3}>3% (Honorarios P.J.)</option>
                          <option value={5}>5% (Alquiler / Otros)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                      <span className="text-slate-500 font-semibold">Monto Retenido:</span>
                      <span className="font-mono font-black text-rose-700">
                        -{formatMoney(totals.retencionIslr)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Active el interruptor si actúa como Agente de Retención para emitir comprobantes de IVA o ISLR.
                </p>
              )}

              {/* IGTF en divisas */}
              {currency === 'USD' && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="igtfCheck"
                      checked={applyIGTF}
                      onChange={(e) => setApplyIGTF(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                    />
                    <label htmlFor="igtfCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Aplica IGTF 3% (Pago en divisas / efectivo)
                    </label>
                  </div>
                  {totals.igtf > 0 && (
                    <span className="font-mono text-xs font-bold text-amber-800">
                      +{formatMoney(totals.igtf)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* BLOQUE 5: PANEL RESUMEN Y LIQUIDACIÓN COMERCIAL                          */}
            {/* ========================================================================= */}
            <div className="md:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Resumen de Liquidación
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {entryMode === 'renglones' ? `${items.length} renglón(es)` : 'Gasto global'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Monto Exento (E):</span>
                    <span className="font-mono font-bold">{formatMoney(totals.exento)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Base Imponible (G):</span>
                    <span className="font-mono font-bold">{formatMoney(totals.base)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Impuesto IVA:</span>
                    <span className="font-mono font-bold">{formatMoney(totals.iva)}</span>
                  </div>

                  {totals.igtf > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>IGTF (3%):</span>
                      <span className="font-mono font-bold">+{formatMoney(totals.igtf)}</span>
                    </div>
                  )}

                  {totals.retencionIva > 0 && (
                    <div className="flex justify-between text-rose-300">
                      <span>Ret. IVA ({retentionIvaPercent}%):</span>
                      <span className="font-mono font-bold">-{formatMoney(totals.retencionIva)}</span>
                    </div>
                  )}

                  {totals.retencionIslr > 0 && (
                    <div className="flex justify-between text-rose-300">
                      <span>Ret. ISLR ({retentionIslrPercent}%):</span>
                      <span className="font-mono font-bold">-{formatMoney(totals.retencionIslr)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total a Pagar Destacado */}
              <div className="pt-3 border-t border-slate-700/80">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Total a Pagar
                  </span>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                      {formatMoney(totals.total)}
                    </span>
                    {currency !== 'VES' && (
                      <span className="block text-xs font-mono font-bold text-slate-400 mt-0.5">
                        Ref: Bs. {formatMoney(totals.total * exchangeRate, 'VES')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL DE SELECCIÓN DE PROVEEDOR                                           */}
      {/* ========================================================================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {isAddingSupplier ? 'Nuevo Proveedor' : 'Directorio de Proveedores'}
              </h2>
              <button 
                onClick={() => {
                  setIsSupplierModalOpen(false);
                  setIsAddingSupplier(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isAddingSupplier ? (
                <>
                  <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Buscar por Razón Social o RIF..."
                        value={supplierSearchTerm}
                        onChange={(e) => setSupplierSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-medium"
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={() => setIsAddingSupplier(true)}
                      className="bg-indigo-600 text-white px-3.5 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
                    >
                      <Plus size={16} />
                      Nuevo Proveedor
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(supplier => (
                        <div 
                          key={supplier.id}
                          onClick={() => handleSelectSupplier(supplier)}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black ${supplier.isCompany ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {supplier.isCompany ? <Building2 size={18} /> : <User size={18} />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs group-hover:text-indigo-700 transition-colors">
                                {supplier.name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {supplier.taxId}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-2xl">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">No se encontraron proveedores</p>
                        <button 
                          onClick={() => setIsAddingSupplier(true)}
                          className="text-indigo-600 font-bold text-xs mt-2 hover:underline cursor-pointer"
                        >
                          Registrar como nuevo proveedor
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={newSupplierIsCompany} 
                        onChange={() => setNewSupplierIsCompany(true)}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-700">Empresa (Jurídico - J)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={!newSupplierIsCompany} 
                        onChange={() => setNewSupplierIsCompany(false)}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-bold text-slate-700">Persona Natural (V/E)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">RIF / Cédula *</label>
                      <input 
                        type="text" 
                        value={newSupplierRif}
                        onChange={(e) => setNewSupplierRif(e.target.value.toUpperCase())}
                        placeholder={newSupplierIsCompany ? "J-12345678-9" : "V-12345678"}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Razón Social / Nombre *</label>
                      <input 
                        type="text" 
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        placeholder="Nombre comercial..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Teléfono</label>
                      <input 
                        type="tel" 
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                        placeholder="+58 414 0000000"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={newSupplierEmail}
                        onChange={(e) => setNewSupplierEmail(e.target.value)}
                        placeholder="administracion@proveedor.com"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Dirección Fiscal</label>
                      <textarea 
                        value={newSupplierAddress}
                        onChange={(e) => setNewSupplierAddress(e.target.value)}
                        rows={2}
                        placeholder="Ciudad, Estado, Dirección..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isAddingSupplier && (
              <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                <button 
                  onClick={() => setIsAddingSupplier(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveNewSupplier}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save size={14} />
                  Guardar Proveedor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVISUALIZACIÓN DE ASIENTO CONTABLE NIIF                          */}
      {/* ========================================================================= */}
      {pendingVoucher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Comprobante Contable de Compra (Libro Diario)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-300">
                      {supplierName}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Verifique el cuadre de las cuentas del Debe y Haber antes del asiento contable
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setPendingVoucher(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors self-end sm:self-auto cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Tabla de Líneas */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 font-bold">
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 block">Concepto / Descripción del Asiento:</span>
                  <input
                    type="text"
                    value={pendingVoucher.comprobante.descripcion || ''}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      const updatedLines = (pendingVoucher.comprobante.lineas || []).map((l: any) => ({ ...l, descripcion: newDesc }));
                      setPendingVoucher({
                        ...pendingVoucher,
                        comprobante: {
                          ...pendingVoucher.comprobante,
                          descripcion: newDesc,
                          lineas: updatedLines
                        }
                      });
                    }}
                    className="w-full px-3 py-1.5 mt-1 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="text-right sm:border-l sm:border-indigo-200/80 sm:pl-4">
                  <span className="text-[10px] font-black uppercase text-indigo-600 block">Fecha Contable:</span>
                  <p className="font-mono text-slate-900">{pendingVoucher.comprobante.fecha}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 w-72">Cuenta Contable</th>
                        <th className="py-3 px-4">Descripción de la Línea</th>
                        <th className="py-3 px-4 text-right w-32">Debe ($)</th>
                        <th className="py-3 px-4 text-right w-32">Haber ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                      {pendingVoucher.comprobante.lineas.map((linea: any, idx: number) => {
                        const cuentaObj = cuentasContables.find(c => c.id === linea.cuentaId || c.codigo === linea.cuentaId);
                        return (
                          <tr key={linea.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            {/* Selector de Cuenta */}
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLineIndex(idx);
                                  setShowAccountSelectorModal(true);
                                }}
                                className="w-full text-left p-2 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all flex items-center justify-between group cursor-pointer"
                              >
                                <div className="truncate pr-2">
                                  <span className="font-mono text-[11px] font-black text-indigo-700 block">
                                    {cuentaObj ? cuentaObj.codigo : (linea.cuentaId || 'Sin asignar')}
                                  </span>
                                  <span className="text-xs text-slate-800 font-bold block truncate group-hover:text-indigo-900">
                                    {cuentaObj ? cuentaObj.nombre : 'Haz clic para seleccionar cuenta...'}
                                  </span>
                                </div>
                                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                              </button>
                            </td>

                            {/* Descripción */}
                            <td className="py-2.5 px-4">
                              <input
                                type="text"
                                value={linea.descripcion || ''}
                                onChange={(e) => {
                                  const updated = [...pendingVoucher.comprobante.lineas];
                                  updated[idx] = { ...updated[idx], descripcion: e.target.value };
                                  setPendingVoucher({
                                    ...pendingVoucher,
                                    comprobante: { ...pendingVoucher.comprobante, lineas: updated }
                                  });
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                                placeholder="Descripción de la línea..."
                              />
                            </td>

                            {/* Debe */}
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={linea.debe !== undefined ? linea.debe : ''}
                                onChange={(e) => {
                                  const updated = [...pendingVoucher.comprobante.lineas];
                                  updated[idx] = { ...updated[idx], debe: parseFloat(e.target.value) || 0 };
                                  const tDebe = updated.reduce((s, l) => s + (Number(l.debe) || 0), 0);
                                  const tHaber = updated.reduce((s, l) => s + (Number(l.haber) || 0), 0);
                                  setPendingVoucher({
                                    ...pendingVoucher,
                                    comprobante: {
                                      ...pendingVoucher.comprobante,
                                      lineas: updated,
                                      total: Math.max(tDebe, tHaber),
                                      estado: Math.abs(tDebe - tHaber) < 0.01 ? 'Contabilizado' : 'Descuadrado'
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-right outline-none focus:bg-white focus:border-indigo-500 text-slate-800"
                              />
                            </td>

                            {/* Haber */}
                            <td className="py-2.5 px-4 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={linea.haber !== undefined ? linea.haber : ''}
                                onChange={(e) => {
                                  const updated = [...pendingVoucher.comprobante.lineas];
                                  updated[idx] = { ...updated[idx], haber: parseFloat(e.target.value) || 0 };
                                  const tDebe = updated.reduce((s, l) => s + (Number(l.debe) || 0), 0);
                                  const tHaber = updated.reduce((s, l) => s + (Number(l.haber) || 0), 0);
                                  setPendingVoucher({
                                    ...pendingVoucher,
                                    comprobante: {
                                      ...pendingVoucher.comprobante,
                                      lineas: updated,
                                      total: Math.max(tDebe, tHaber),
                                      estado: Math.abs(tDebe - tHaber) < 0.01 ? 'Contabilizado' : 'Descuadrado'
                                    }
                                  });
                                }}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-right outline-none focus:bg-white focus:border-indigo-500 text-slate-800"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Debe:</span>
                  <span className="font-mono font-black text-slate-800 text-sm">
                    ${(pendingVoucher.comprobante.lineas.reduce((s: number, l: any) => s + (Number(l.debe) || 0), 0)).toFixed(2)}
                  </span>
                </div>
                <div className="border-l border-slate-300 pl-4">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Haber:</span>
                  <span className="font-mono font-black text-slate-800 text-sm">
                    ${(pendingVoucher.comprobante.lineas.reduce((s: number, l: any) => s + (Number(l.haber) || 0), 0)).toFixed(2)}
                  </span>
                </div>
                <div className="border-l border-slate-300 pl-4">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Estado:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    pendingVoucher.comprobante.estado === 'Contabilizado'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {pendingVoucher.comprobante.estado}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPendingVoucher(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Volver al Formulario
                </button>
                <button
                  type="button"
                  onClick={() => pendingVoucher.onConfirm(pendingVoucher.comprobante)}
                  disabled={pendingVoucher.comprobante.estado !== 'Contabilizado'}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar y Asentar en Diario</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Selector de Cuenta Contable */}
      <CuentaContableModal
        isOpen={showAccountSelectorModal}
        onClose={() => setShowAccountSelectorModal(false)}
        cuentasContables={cuentasContables}
        onSelect={(cuenta) => {
          if (pendingVoucher && selectedLineIndex !== null) {
            const updated = [...pendingVoucher.comprobante.lineas];
            updated[selectedLineIndex] = {
              ...updated[selectedLineIndex],
              cuentaId: cuenta.codigo || cuenta.id
            };
            setPendingVoucher({
              ...pendingVoucher,
              comprobante: { ...pendingVoucher.comprobante, lineas: updated }
            });
          }
          setShowAccountSelectorModal(false);
          setSelectedLineIndex(null);
        }}
      />

    </div>
  );
}
