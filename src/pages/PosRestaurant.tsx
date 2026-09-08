import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, Search, ShoppingCart, Plus, Minus, Trash2, 
  CreditCard, DollarSign, RefreshCw, Printer, CheckCircle, User, 
  AlertCircle, ArrowRight, X, Sparkles, Tag, Layers, Check, 
  Users, Clock, ArrowLeft, ArrowUpDown, ChevronRight, LayoutGrid, 
  Receipt, Calendar, ShieldCheck, ArrowDownLeft, FileText, ChevronDown,
  Maximize, Minimize, Smartphone, Tablet, Share2, Edit3, MessageSquare,
  ChevronLeft, Coffee, Wine, Pizza, Flame, Award, HelpCircle
} from 'lucide-react';
import { 
  dbSaveFacturaVenta, 
  dbSaveComprobante, 
  dbSaveCxc 
} from '../services/db';
import PosTicketPrint from '../components/billing/PosTicketPrint';
import { PrintPreview } from '../components/PrintPreview';

export interface MesaRestaurant {
  id: string;
  numero: string;
  zona: string;
  capacidad: number;
  estado: 'libre' | 'ocupada' | 'cuenta';
  cliente: {
    id: string;
    name: string;
    taxId: string;
    phone?: string;
    address?: string;
  };
  cart: Array<{
    id: string;
    nombre: string;
    descripcion?: string;
    precioUnitario: number;
    cantidad: number;
    exento: boolean;
    notas?: string;
  }>;
  mesero?: string;
  personas?: number;
  openedAt?: string;
  notas?: string;
}

export interface PagoLinea {
  id: string;
  metodo: string;
  metodoNombre: string;
  montoUsd: number;
  montoVes: number;
  bancoId?: string;
  referencia?: string;
}

interface PosRestaurantProps {
  servicios?: any[];
  contactos?: any[];
  bancos?: any[];
  cuentasContables?: any[];
  configContable?: any;
  empresa?: any;
  onSave?: (collection: string, data: any) => Promise<any> | void;
  reloadCxc?: () => Promise<void>;
  reloadComprobantes?: () => Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onSaleCompleted?: (factura: any) => void;
}

const DEFAULT_MESAS: MesaRestaurant[] = [
  { id: 'm1', numero: 'Mesa 1', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm2', numero: 'Mesa 2', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm3', numero: 'Mesa 3', zona: 'Salón', capacidad: 6, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 4 },
  { id: 'm4', numero: 'Mesa 4', zona: 'Salón', capacidad: 2, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm5', numero: 'Mesa 5', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm6', numero: 'Mesa 6', zona: 'Salón', capacidad: 8, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 6 },
  { id: 't1', numero: 'Terraza 1', zona: 'Terraza', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 't2', numero: 'Terraza 2', zona: 'Terraza', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 't3', numero: 'Terraza 3', zona: 'Terraza', capacidad: 6, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 4 },
  { id: 'b1', numero: 'Barra 1', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'b2', numero: 'Barra 2', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'b3', numero: 'Barra 3', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'd1', numero: 'Para Llevar 1', zona: 'Para Llevar', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'd2', numero: 'Delivery 1', zona: 'Delivery', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 }
];

const METODOS_PAGO_CONFIG = [
  { id: 'usd_cash', nombre: 'Efectivo USD', icono: '💵', color: 'emerald' },
  { id: 'punto', nombre: 'Punto de Venta', icono: '💳', color: 'blue' },
  { id: 'pago_movil', nombre: 'Pago Móvil', icono: '📱', color: 'violet' },
  { id: 'zelle', nombre: 'Zelle', icono: '💎', color: 'indigo' },
  { id: 'ves_cash', nombre: 'Efectivo Bs.', icono: '🇻🇪', color: 'amber' },
  { id: 'transferencia', nombre: 'Transferencia', icono: '🏦', color: 'sky' },
  { id: 'tarjeta_int', nombre: 'Tarjeta Int.', icono: '🌐', color: 'slate' },
];

export const PosRestaurant: React.FC<PosRestaurantProps> = ({
  servicios = [],
  contactos = [],
  bancos = [],
  cuentasContables = [],
  configContable = {} as any,
  empresa,
  onSave,
  reloadCxc,
  reloadComprobantes,
  showToast,
  onSaleCompleted
}) => {
  const navigate = useNavigate();
  const empresaId = empresa?.id || 'empresa-local-1';
  const storageKey = `erp_restaurant_mesas_${empresaId}`;

  // Tasa de cambio BCV
  const tasaCambio = useMemo(() => {
    const t = Number(configContable?.tasa_bcv || configContable?.tasaCambio || 60);
    return t > 0 ? t : 60;
  }, [configContable]);

  // Estado de Mesas con persistencia
  const [mesas, setMesas] = useState<MesaRestaurant[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error reading saved mesas", e);
    }
    return DEFAULT_MESAS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(mesas));
    } catch (e) {
      console.error("Error saving mesas", e);
    }
  }, [mesas, storageKey]);

  // Mesa activa
  const [activeMesaId, setActiveMesaId] = useState<string>('m1');
  const currentMesa = useMemo(() => {
    return mesas.find(m => m.id === activeMesaId) || mesas[0] || DEFAULT_MESAS[0];
  }, [mesas, activeMesaId]);

  // Pestaña activa en versión móvil (teléfonos): 'mesas' | 'menu' | 'comanda'
  const [mobileTab, setMobileTab] = useState<'mesas' | 'menu' | 'comanda'>('mesas');

  // Filtro de Zonas de Mesas
  const [selectedZona, setSelectedZona] = useState<string>('Todas');
  const [zonaFilterStatus, setZonaFilterStatus] = useState<'todas' | 'libres' | 'ocupadas' | 'cuenta'>('todas');

  // Catálogo de Productos / Comidas
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Pantalla completa nativa
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Modales
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetMesaId, setTransferTargetMesaId] = useState<string>('');
  const [isItemNoteModalOpen, setIsItemNoteModalOpen] = useState(false);
  const [activeItemForNote, setActiveItemForNote] = useState<any>(null);
  const [tempItemNote, setTempItemNote] = useState('');

  // Modal de Cobro Táctil
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'contado' | 'cxc'>('contado');
  const [pagosLineas, setPagosLineas] = useState<PagoLinea[]>([]);
  const [activePagoIdForNumpad, setActivePagoIdForNumpad] = useState<string | null>(null);

  // Modo CxC
  const [creditDays, setCreditDays] = useState<number>(15);
  const [creditDueDate, setCreditDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [creditNotas, setCreditNotas] = useState('');

  // Estados de impresión / ticket
  const [isProcessing, setIsProcessing] = useState(false);
  const [facturaFinalizada, setFacturaFinalizada] = useState<any>(null);
  const [isPrintTicketOpen, setIsPrintTicketOpen] = useState(false);
  const [isPreCuentaPrint, setIsPreCuentaPrint] = useState(false);

  // Lista de zonas únicas
  const zonasList = useMemo(() => {
    const s = new Set<string>();
    mesas.forEach(m => s.add(m.zona));
    return ['Todas', ...Array.from(s)];
  }, [mesas]);

  // Categorías de productos
  const categoriesList = useMemo(() => {
    const s = new Set<string>();
    servicios.forEach(srv => {
      if (srv.categoria) s.add(srv.categoria);
    });
    return ['Todas', ...Array.from(s)];
  }, [servicios]);

  // Platos filtrados
  const filteredProducts = useMemo(() => {
    return servicios.filter(p => {
      const matchesCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        p.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.descripcion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [servicios, selectedCategory, searchQuery]);

  // Cálculos de la Comanda Activa
  const cartSubtotalUsd = useMemo(() => {
    return currentMesa.cart.reduce((acc, it) => acc + (it.precioUnitario * it.cantidad), 0);
  }, [currentMesa.cart]);

  const cartIvaUsd = useMemo(() => {
    return currentMesa.cart.reduce((acc, it) => {
      if (it.exento) return acc;
      return acc + (it.precioUnitario * it.cantidad * 0.16);
    }, 0);
  }, [currentMesa.cart]);

  const totalUsd = cartSubtotalUsd + cartIvaUsd;
  const totalVes = totalUsd * tasaCambio;

  const totalItemsCount = useMemo(() => {
    return currentMesa.cart.reduce((acc, it) => acc + it.cantidad, 0);
  }, [currentMesa.cart]);

  // Total pagado en el modal de cobro
  const totalPagadoUsd = useMemo(() => {
    return pagosLineas.reduce((acc, p) => acc + (p.montoUsd || 0), 0);
  }, [pagosLineas]);

  const saldoRestanteUsd = Math.max(0, totalUsd - totalPagadoUsd);
  const cambioUsd = Math.max(0, totalPagadoUsd - totalUsd);
  const cambioVes = cambioUsd * tasaCambio;

  // Actualizar mesa actual helper
  const updateCurrentMesa = (updater: (m: MesaRestaurant) => MesaRestaurant) => {
    setMesas(prev => prev.map(m => m.id === activeMesaId ? updater(m) : m));
  };

  // Manejo de platos en la comanda
  const handleAddToCart = (producto: any) => {
    updateCurrentMesa(mesa => {
      const existing = mesa.cart.find(it => it.id === producto.id);
      let newCart;
      if (existing) {
        newCart = mesa.cart.map(it => it.id === producto.id ? { ...it, cantidad: it.cantidad + 1 } : it);
      } else {
        const precio = Number(producto.precio || producto.precioVenta || producto.precioUnitario || 0);
        newCart = [
          ...mesa.cart,
          {
            id: producto.id,
            nombre: producto.nombre || 'Plato / Bebida',
            descripcion: producto.descripcion || '',
            precioUnitario: precio,
            cantidad: 1,
            exento: Boolean(producto.exento),
            notas: ''
          }
        ];
      }
      return {
        ...mesa,
        cart: newCart,
        estado: mesa.estado === 'libre' ? 'ocupada' : mesa.estado,
        openedAt: mesa.openedAt || new Date().toISOString()
      };
    });
    if (showToast) {
      showToast(`+1 ${producto.nombre}`, 'info');
    }
  };

  const handleUpdateItemQty = (id: string, delta: number) => {
    updateCurrentMesa(mesa => {
      const newCart = mesa.cart
        .map(it => {
          if (it.id === id) {
            const nextQty = it.cantidad + delta;
            return nextQty > 0 ? { ...it, cantidad: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as any[];

      return {
        ...mesa,
        cart: newCart,
        estado: newCart.length === 0 ? 'libre' : mesa.estado
      };
    });
  };

  const handleRemoveFromCart = (id: string) => {
    updateCurrentMesa(mesa => {
      const newCart = mesa.cart.filter(it => it.id !== id);
      return {
        ...mesa,
        cart: newCart,
        estado: newCart.length === 0 ? 'libre' : mesa.estado
      };
    });
  };

  const handleClearCart = () => {
    if (window.confirm(`¿Liberar y vaciar los consumos de la ${currentMesa.numero}?`)) {
      updateCurrentMesa(mesa => ({
        ...mesa,
        cart: [],
        estado: 'libre',
        mesero: '',
        openedAt: undefined,
        cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }
      }));
      if (showToast) showToast(`Mesa liberada`, 'info');
    }
  };

  // Guardar nota de cocina en ítem
  const handleSaveItemNote = () => {
    if (!activeItemForNote) return;
    updateCurrentMesa(mesa => ({
      ...mesa,
      cart: mesa.cart.map(it => it.id === activeItemForNote.id ? { ...it, notas: tempItemNote } : it)
    }));
    setIsItemNoteModalOpen(false);
    setActiveItemForNote(null);
  };

  // Abrir Modal de Cobro Táctil
  const handleOpenCheckout = () => {
    if (currentMesa.cart.length === 0) {
      if (showToast) showToast("La comanda está vacía", "error");
      return;
    }
    // Inicializar pago rápido con 100% Efectivo USD
    const initialUsd = totalUsd;
    const initialVes = initialUsd * tasaCambio;
    const defaultPagoId = 'pago_1';
    setPagosLineas([
      {
        id: defaultPagoId,
        metodo: 'usd_cash',
        metodoNombre: 'Efectivo USD',
        montoUsd: initialUsd,
        montoVes: initialVes,
        bancoId: bancos[0]?.id || '',
        referencia: ''
      }
    ]);
    setActivePagoIdForNumpad(defaultPagoId);
    setCheckoutMode('contado');
    setIsCheckoutOpen(true);
  };

  // One-Touch método de pago
  const handleToggleOrAssignMetodo = (metodoId: string, metodoNombre: string) => {
    const existingIndex = pagosLineas.findIndex(p => p.metodo === metodoId);

    if (pagosLineas.length <= 1) {
      // Reemplazo total con 1 toque
      const newPago: PagoLinea = {
        id: `pago_${Date.now()}`,
        metodo: metodoId,
        metodoNombre,
        montoUsd: totalUsd,
        montoVes: totalUsd * tasaCambio,
        bancoId: bancos[0]?.id || '',
        referencia: ''
      };
      setPagosLineas([newPago]);
      setActivePagoIdForNumpad(newPago.id);
      return;
    }

    if (existingIndex >= 0) {
      // Ya existe, activar para el Numpad
      setActivePagoIdForNumpad(pagosLineas[existingIndex].id);
    } else {
      // Agregar nuevo método con el saldo restante
      const montoAsignar = saldoRestanteUsd > 0.001 ? saldoRestanteUsd : 0;
      const newPago: PagoLinea = {
        id: `pago_${Date.now()}`,
        metodo: metodoId,
        metodoNombre,
        montoUsd: Number(montoAsignar.toFixed(2)),
        montoVes: Number((montoAsignar * tasaCambio).toFixed(2)),
        bancoId: bancos[0]?.id || '',
        referencia: ''
      };
      setPagosLineas([...pagosLineas, newPago]);
      setActivePagoIdForNumpad(newPago.id);
    }
  };

  // Teclado numérico táctil (Numpad) en pantalla
  const handleNumpadInput = (val: string) => {
    if (!activePagoIdForNumpad) return;

    setPagosLineas(prev => prev.map(p => {
      if (p.id !== activePagoIdForNumpad) return p;

      let str = String(p.montoUsd || '');
      if (val === 'CLEAR') {
        str = '0';
      } else if (val === 'BACK') {
        str = str.slice(0, -1) || '0';
      } else if (val === '.') {
        if (!str.includes('.')) str += '.';
      } else {
        if (str === '0') str = val;
        else str += val;
      }

      const parsed = parseFloat(str) || 0;
      return {
        ...p,
        montoUsd: parsed,
        montoVes: Number((parsed * tasaCambio).toFixed(2))
      };
    }));
  };

  // Atajos rápidos de billetes
  const handleQuickBill = (amount: number | 'exact') => {
    if (!activePagoIdForNumpad) return;
    setPagosLineas(prev => prev.map(p => {
      if (p.id !== activePagoIdForNumpad) return p;
      const newAmount = amount === 'exact' ? totalUsd : amount;
      return {
        ...p,
        montoUsd: newAmount,
        montoVes: Number((newAmount * tasaCambio).toFixed(2))
      };
    }));
  };

  // Actualizar monto manual
  const handleUpdatePagoMonto = (id: string, valUsd: number) => {
    setPagosLineas(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          montoUsd: valUsd,
          montoVes: Number((valUsd * tasaCambio).toFixed(2))
        };
      }
      return p;
    }));
  };

  const handleRemovePagoLinea = (id: string) => {
    if (pagosLineas.length <= 1) return;
    setPagosLineas(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activePagoIdForNumpad === id && next.length > 0) {
        setActivePagoIdForNumpad(next[0].id);
      }
      return next;
    });
  };

  // Pre-Cuenta para imprimir
  const handlePrintPreCuenta = () => {
    if (currentMesa.cart.length === 0) return;
    updateCurrentMesa(m => ({ ...m, estado: 'cuenta' }));
    setIsPreCuentaPrint(true);
    setFacturaFinalizada({
      numero: `PRE-${currentMesa.numero.replace(/\s+/g, '')}`,
      fecha: new Date().toISOString(),
      cliente: currentMesa.cliente,
      items: currentMesa.cart.map(it => ({
        id: it.id,
        nombre: it.nombre,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        exento: it.exento,
        notas: it.notas
      })),
      subtotal: cartSubtotalUsd,
      iva: cartIvaUsd,
      total: totalUsd,
      totalVes: totalVes,
      tasaCambio: tasaCambio,
      mesa: currentMesa.numero,
      zona: currentMesa.zona,
      mesero: currentMesa.mesero || 'General',
      isPreCuenta: true
    });
    setIsPrintTicketOpen(true);
  };

  // Finalizar cobro
  const handleFinalizeSale = async () => {
    if (checkoutMode === 'contado' && saldoRestanteUsd > 0.01) {
      if (showToast) showToast("Aún falta cubrir el total de la cuenta", "error");
      return;
    }
    if (checkoutMode === 'cxc' && currentMesa.cliente.id === 'cli_final') {
      if (showToast) showToast("Para cargar a crédito debes seleccionar un cliente registrado con RIF/CI", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      const facturaDoc: any = {
        empresa_id: empresaId,
        numero: invoiceNumber,
        fecha: nowIso.split('T')[0],
        termino: checkoutMode === 'cxc' ? 'credito' : 'contado',
        diasCredito: checkoutMode === 'cxc' ? creditDays : 0,
        fechaVencimiento: checkoutMode === 'cxc' ? creditDueDate : undefined,
        cliente: currentMesa.cliente,
        items: currentMesa.cart.map(it => ({
          servicio_id: it.id,
          nombre: it.nombre,
          descripcion: it.descripcion || '',
          cantidad: it.cantidad,
          precio_unitario: it.precioUnitario,
          exento: it.exento,
          notas: it.notas || ''
        })),
        subtotal: cartSubtotalUsd,
        iva: cartIvaUsd,
        total: totalUsd,
        totalVes: totalVes,
        tasaCambio: tasaCambio,
        mesa: currentMesa.numero,
        zona: currentMesa.zona,
        mesero: currentMesa.mesero || 'Caja Mostrador',
        pagosLineas: checkoutMode === 'contado' ? pagosLineas : [],
        cambioUsd: cambioUsd,
        cambioVes: cambioVes,
        observaciones: checkoutMode === 'cxc' 
          ? (creditNotas || `Consumo Restaurante ${currentMesa.numero} - Crédito a ${creditDays} días`)
          : `Consumo Restaurante ${currentMesa.numero} - ${pagosLineas.map(p => `${p.metodoNombre}: $${p.montoUsd}`).join(' | ')}`,
        created_at: nowIso,
        status: checkoutMode === 'cxc' ? 'Pendiente' : 'Pagada'
      };

      const res = await dbSaveFacturaVenta(facturaDoc, empresaId);
      const savedFactura = res?.success ? res.data : facturaDoc;

      // Cargar a Cuentas por Cobrar si es a Crédito
      if (checkoutMode === 'cxc') {
        await dbSaveCxc({
          empresa_id: empresaId,
          cliente_id: currentMesa.cliente.id,
          cliente_nombre: currentMesa.cliente.name,
          cliente_rif: currentMesa.cliente.taxId,
          factura_id: savedFactura?.id || invoiceNumber,
          factura_numero: invoiceNumber,
          fecha_emision: nowIso.split('T')[0],
          fecha_vencimiento: creditDueDate,
          monto_total: totalUsd,
          monto_total_ves: totalVes,
          saldo_pendiente: totalUsd,
          saldo_pendiente_ves: totalVes,
          estado: 'Pendiente',
          descripcion: creditNotas || `Consumo Restaurante ${currentMesa.numero} - ${currentMesa.cliente.name}`
        }, empresaId);
        if (reloadCxc) await reloadCxc();
      }

      // Asiento Contable Automático
      try {
        const ctaVentas = cuentasContables.find(c => c.codigo?.startsWith('4.1.01') || c.nombre?.toLowerCase().includes('venta') || c.nombre?.toLowerCase().includes('ingreso'))?.codigo || '4.1.01.01';
        const ctaIva = cuentasContables.find(c => c.codigo?.startsWith('2.1.04') || c.nombre?.toLowerCase().includes('debito fiscal') || c.nombre?.toLowerCase().includes('iva'))?.codigo || '2.1.04.01';
        const ctaCxc = cuentasContables.find(c => c.codigo?.startsWith('1.1.03') || c.nombre?.toLowerCase().includes('cuentas por cobrar') || c.nombre?.toLowerCase().includes('clientes'))?.codigo || '1.1.03.01';
        const ctaCaja = cuentasContables.find(c => c.codigo?.startsWith('1.1.01') || c.nombre?.toLowerCase().includes('caja'))?.codigo || '1.1.01.01';

        const lineasAsiento: any[] = [];

        if (checkoutMode === 'cxc') {
          lineasAsiento.push({
            cuenta_codigo: ctaCxc,
            debe: totalUsd,
            haber: 0,
            debe_ves: totalVes,
            haber_ves: 0,
            descripcion: `CxC Factura ${invoiceNumber} - Mesa ${currentMesa.numero}`
          });
        } else {
          pagosLineas.forEach(p => {
            lineasAsiento.push({
              cuenta_codigo: ctaCaja,
              debe: p.montoUsd,
              haber: 0,
              debe_ves: p.montoVes,
              haber_ves: 0,
              descripcion: `Ingreso ${p.metodoNombre} Factura ${invoiceNumber} - Mesa ${currentMesa.numero}`
            });
          });
        }

        lineasAsiento.push({
          cuenta_codigo: ctaVentas,
          debe: 0,
          haber: cartSubtotalUsd,
          debe_ves: 0,
          haber_ves: cartSubtotalUsd * tasaCambio,
          descripcion: `Venta Restaurante ${invoiceNumber} - Mesa ${currentMesa.numero}`
        });

        if (cartIvaUsd > 0) {
          lineasAsiento.push({
            cuenta_codigo: ctaIva,
            debe: 0,
            haber: cartIvaUsd,
            debe_ves: 0,
            haber_ves: cartIvaUsd * tasaCambio,
            descripcion: `IVA Débito Fiscal Factura ${invoiceNumber}`
          });
        }

        const compNumero = `AS-${Date.now().toString().slice(-6)}`;
        await dbSaveComprobante({
          empresa_id: empresaId,
          numero: compNumero,
          fecha: nowIso.split('T')[0],
          tipo: 'ingreso',
          concepto: checkoutMode === 'cxc'
            ? `Venta a Crédito (CxC) ${invoiceNumber} - Restaurante Mesa ${currentMesa.numero}`
            : `Venta Contado ${invoiceNumber} - Restaurante Mesa ${currentMesa.numero}`,
          lineas: lineasAsiento,
          total_debe: totalUsd,
          total_haber: totalUsd,
          total_debe_ves: totalVes,
          total_haber_ves: totalVes,
          modulo_origen: 'Restaurante / POS',
          origen_id: savedFactura?.id || invoiceNumber
        }, empresaId);
        if (reloadComprobantes) await reloadComprobantes();
      } catch (errAsiento) {
        console.warn("Advertencia al generar asiento contable:", errAsiento);
      }

      // Liberar la Mesa
      updateCurrentMesa(m => ({
        ...m,
        cart: [],
        estado: 'libre',
        mesero: '',
        openedAt: undefined,
        cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }
      }));

      setIsCheckoutOpen(false);
      setIsPreCuentaPrint(false);
      setFacturaFinalizada(facturaDoc);
      setIsPrintTicketOpen(true);

      if (onSaleCompleted) onSaleCompleted(savedFactura);
      if (showToast) {
        showToast(
          checkoutMode === 'cxc' 
            ? `Factura ${invoiceNumber} cargada a CxC con éxito` 
            : `Venta ${invoiceNumber} cobrada exitosamente ($${totalUsd.toFixed(2)})`,
          'success'
        );
      }
    } catch (error: any) {
      console.error("Error finalizing sale", error);
      if (showToast) showToast(`Error al procesar: ${error.message || 'Error desconocido'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Transferir Mesa
  const handleTransferMesa = () => {
    if (!transferTargetMesaId || transferTargetMesaId === activeMesaId) return;
    const target = mesas.find(m => m.id === transferTargetMesaId);
    if (!target) return;

    setMesas(prev => prev.map(m => {
      if (m.id === transferTargetMesaId) {
        return {
          ...m,
          cart: [...m.cart, ...currentMesa.cart],
          estado: 'ocupada',
          cliente: currentMesa.cliente,
          mesero: currentMesa.mesero || m.mesero,
          openedAt: m.openedAt || currentMesa.openedAt || new Date().toISOString()
        };
      }
      if (m.id === activeMesaId) {
        return {
          ...m,
          cart: [],
          estado: 'libre',
          mesero: '',
          openedAt: undefined,
          cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }
        };
      }
      return m;
    }));

    setActiveMesaId(transferTargetMesaId);
    setIsTransferModalOpen(false);
    if (showToast) showToast(`Comanda transferida a ${target.numero}`, 'info');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none font-sans">
      
      {/* 1. HEADER TÁCTIL SUPERIOR (Ergonómico para Tablets y Teléfonos) */}
      <header className="shrink-0 bg-slate-900 text-white px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between shadow-md z-30 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="Volver a Facturación"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">ERP</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base leading-tight">CAJA MOSTRADOR</h1>
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  POS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {empresa?.nombre || 'Restaurante'} • Tasa BCV: <span className="text-emerald-400 font-bold">{tasaCambio.toFixed(2)} Bs/$</span>
              </p>
            </div>
          </div>
        </div>

        {/* Indicador Mesa Activa en Header */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setMobileTab('mesas')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              currentMesa.estado === 'libre'
                ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300'
                : currentMesa.estado === 'cuenta'
                ? 'bg-amber-600/30 border border-amber-500 text-amber-300 animate-pulse'
                : 'bg-blue-600/30 border border-blue-500 text-blue-300'
            }`}
          >
            <span>{currentMesa.numero}</span>
            <span className="text-[10px] font-normal text-slate-300 hidden md:inline">({currentMesa.zona})</span>
            <span className={`w-2 h-2 rounded-full ${
              currentMesa.estado === 'libre' ? 'bg-emerald-400' : currentMesa.estado === 'cuenta' ? 'bg-amber-400' : 'bg-blue-400'
            }`} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-95"
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL: ADAPTABLE TABLET vs TELÉFONO */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* VISTA 1: PLANO DE MESAS Y ZONAS (Visible en Teléfono si mobileTab === 'mesas', o toggleable en Tablet) */}
        <div className={`
          flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 transition-all
          ${mobileTab === 'mesas' ? 'flex' : 'hidden md:flex md:w-1/3 md:max-w-xs md:flex-none border-r border-slate-200 dark:border-slate-800'}
        `}>
          {/* Barra de Filtros de Zonas */}
          <div className="shrink-0 space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                Zonas & Mesas
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {mesas.filter(m => m.estado !== 'libre').length} Ocupadas / {mesas.length} Total
              </span>
            </div>

            {/* Chips de Zonas deslizables */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {zonasList.map(zona => (
                <button
                  key={zona}
                  onClick={() => setSelectedZona(zona)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    selectedZona === zona
                      ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {zona}
                </button>
              ))}
            </div>

            {/* Filtro de Estado Rápido */}
            <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
              {[
                { id: 'todas', label: 'Todas', color: 'slate' },
                { id: 'libres', label: 'Libres', color: 'emerald' },
                { id: 'ocupadas', label: 'Ocupadas', color: 'blue' },
                { id: 'cuenta', label: 'Cuenta', color: 'amber' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setZonaFilterStatus(st.id as any)}
                  className={`py-1 rounded-lg text-center transition-all ${
                    zonaFilterStatus === st.id
                      ? 'bg-slate-700 text-white font-black'
                      : 'bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuadrícula Táctil de Mesas */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-2.5">
              {mesas
                .filter(m => selectedZona === 'Todas' || m.zona === selectedZona)
                .filter(m => {
                  if (zonaFilterStatus === 'libres') return m.estado === 'libre';
                  if (zonaFilterStatus === 'ocupadas') return m.estado === 'ocupada';
                  if (zonaFilterStatus === 'cuenta') return m.estado === 'cuenta';
                  return true;
                })
                .map(mesa => {
                  const isSelected = mesa.id === activeMesaId;
                  const mesaTotalUsd = mesa.cart.reduce((a, b) => a + (b.precioUnitario * b.cantidad), 0);
                  const itemsCount = mesa.cart.reduce((a, b) => a + b.cantidad, 0);

                  return (
                    <button
                      key={mesa.id}
                      onClick={() => {
                        setActiveMesaId(mesa.id);
                        // Si está en teléfono, pasar a ver el Menú al seleccionar mesa
                        if (window.innerWidth < 768) {
                          setMobileTab(mesa.cart.length > 0 ? 'comanda' : 'menu');
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between active:scale-95 shadow-sm min-h-[95px] ${
                        isSelected
                          ? 'ring-2 ring-amber-500 shadow-md scale-[1.02]'
                          : ''
                      } ${
                        mesa.estado === 'libre'
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          : mesa.estado === 'cuenta'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
                          : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-black text-sm text-slate-900 dark:text-white leading-none">
                          {mesa.numero}
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          mesa.estado === 'libre' ? 'bg-emerald-500' : mesa.estado === 'cuenta' ? 'bg-amber-500 animate-ping' : 'bg-blue-500'
                        }`} />
                      </div>

                      <div className="my-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{mesa.zona}</span>
                        {mesa.personas && (
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" /> {mesa.personas}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-end pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        {mesa.estado === 'libre' ? (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                            Libre
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {itemsCount} {itemsCount === 1 ? 'ítem' : 'ítems'}
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              ${mesaTotalUsd.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* VISTA 2: CATÁLOGO DE MENÚ Y PLATOS (Visible en Teléfono si mobileTab === 'menu', o siempre en Tablet) */}
        <div className={`
          flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 transition-all
          ${mobileTab === 'menu' ? 'flex' : 'hidden md:flex'}
        `}>
          {/* Barra Superior del Menú: Buscador y Categorías */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar plato, bebida, código..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Botón rápido a Comanda en Móvil */}
              <button
                onClick={() => setMobileTab('comanda')}
                className="md:hidden px-3 py-2 bg-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shrink-0"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{totalItemsCount}</span>
                <span>(${totalUsd.toFixed(2)})</span>
              </button>
            </div>

            {/* Categorías Táctiles Horizontales */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de Platos / Tarjetas Táctiles Grandes (>48px) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Coffee className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-xs font-bold">No hay platos en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredProducts.map(p => {
                  const precio = Number(p.precio || p.precioVenta || p.precioUnitario || 0);
                  const inCartQty = currentMesa.cart.find(it => it.id === p.id)?.cantidad || 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleAddToCart(p)}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:border-amber-500 dark:hover:border-amber-500 text-left transition-all active:scale-95 shadow-sm flex flex-col justify-between group relative overflow-hidden min-h-[105px]"
                    >
                      {inCartQty > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full shadow">
                          {inCartQty} en mesa
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {p.nombre}
                        </h4>
                        {p.categoria && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mt-0.5">
                            {p.categoria}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <div>
                          <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                            ${precio.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ~{(precio * tasaCambio).toFixed(2)} Bs
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* VISTA 3: COMANDA Y CUENTA ACTIVA (Visible en Teléfono si mobileTab === 'comanda', o panel derecho en Tablet) */}
        <div className={`
          flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-xl transition-all
          ${mobileTab === 'comanda' ? 'flex flex-1 w-full' : 'hidden md:flex md:w-80 lg:w-96 md:flex-none'}
        `}>
          {/* Cabecera de la Comanda */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  {currentMesa.numero}
                </span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold">
                  {currentMesa.zona}
                </span>
              </div>

              {/* Acciones de Mesa: Transferir / Liberar */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-xs"
                  title="Mover o transferir a otra mesa"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
                {currentMesa.cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all text-xs"
                    title="Vaciar comanda y liberar mesa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mesero y Cliente */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={currentMesa.mesero || ''}
                  onChange={e => updateCurrentMesa(m => ({ ...m, mesero: e.target.value }))}
                  placeholder="Mesero..."
                  className="bg-transparent w-full text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsClientModalOpen(true)}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs font-bold truncate"
              >
                <span className="truncate text-slate-700 dark:text-slate-300">
                  {currentMesa.cliente?.name?.split(' ')[0] || 'Cliente'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>
          </div>

          {/* Lista de Platos en la Comanda */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {currentMesa.cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-30 text-amber-500" />
                <p className="text-xs font-bold text-center">Comanda vacía</p>
                <p className="text-[11px] text-center text-slate-500 mt-0.5">
                  Toca los platos del menú para agregarlos a la mesa
                </p>
                <button
                  onClick={() => setMobileTab('menu')}
                  className="mt-3 px-4 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl md:hidden"
                >
                  Abrir Menú
                </button>
              </div>
            ) : (
              currentMesa.cart.map(item => {
                const itemTotal = item.precioUnitario * item.cantidad;
                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.nombre}
                        </h5>
                        <span className="text-[10px] text-slate-500">
                          ${item.precioUnitario.toFixed(2)} c/u
                        </span>
                      </div>
                      <span className="font-black text-xs text-slate-900 dark:text-white shrink-0">
                        ${itemTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Nota de cocina del plato */}
                    {item.notas ? (
                      <div className="flex items-center justify-between text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        <span className="truncate italic font-medium">Nota: {item.notas}</span>
                        <button
                          onClick={() => {
                            setActiveItemForNote(item);
                            setTempItemNote(item.notas || '');
                            setIsItemNoteModalOpen(true);
                          }}
                          className="ml-1 text-amber-600 font-bold"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveItemForNote(item);
                          setTempItemNote('');
                          setIsItemNoteModalOpen(true);
                        }}
                        className="text-[10px] text-slate-400 hover:text-amber-600 flex items-center gap-1 font-medium"
                      >
                        <Plus className="w-3 h-3" /> Agregar nota cocina...
                      </button>
                    )}

                    {/* Controles de cantidad táctiles grandes (>44px) */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateItemQty(item.id, -1)}
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center justify-center font-black active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-black text-xs text-slate-900 dark:text-white">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateItemQty(item.id, 1)}
                          className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 hover:bg-amber-200 flex items-center justify-center font-black active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Eliminar plato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pie de Comanda: Totales, Pre-Cuenta y Botón Cobrar */}
          <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5 shadow-lg">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-bold">${cartSubtotalUsd.toFixed(2)}</span>
              </div>
              {cartIvaUsd > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>IVA (16%):</span>
                  <span className="font-bold">${cartIvaUsd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">TOTAL:</span>
                  <span className="text-[10px] text-slate-400 block font-normal">
                    Tasa: {tasaCambio.toFixed(2)} Bs/$
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-lg sm:text-xl text-emerald-600 dark:text-emerald-400">
                    ${totalUsd.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 block">
                    ~{totalVes.toFixed(2)} Bs
                  </span>
                </div>
              </div>
            </div>

            {/* Botones de Acción de Comanda */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={currentMesa.cart.length === 0}
                onClick={handlePrintPreCuenta}
                className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Pre-Cuenta</span>
              </button>

              <button
                type="button"
                disabled={currentMesa.cart.length === 0}
                onClick={handleOpenCheckout}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-40"
              >
                <CreditCard className="w-4 h-4" />
                <span>Cobrar Mesa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA INFERIOR DE NAVEGACIÓN EN TELÉFONOS (BOTTOM NAVIGATION BAR) */}
      <nav className="md:hidden shrink-0 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => setMobileTab('mesas')}
          className={`flex-1 py-1 flex flex-col items-center gap-1 transition-all ${
            mobileTab === 'mesas' ? 'text-amber-400 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px]">Mesas ({mesas.filter(m => m.estado !== 'libre').length})</span>
        </button>

        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-1 flex flex-col items-center gap-1 transition-all ${
            mobileTab === 'menu' ? 'text-amber-400 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px]">Menú</span>
        </button>

        <button
          onClick={() => setMobileTab('comanda')}
          className={`flex-1 py-1 flex flex-col items-center gap-1 transition-all relative ${
            mobileTab === 'comanda' ? 'text-amber-400 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[9px]">
                {totalItemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Cuenta (${totalUsd.toFixed(2)})</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MODAL DE COBRO TÁCTIL CON NUMPAD INTEGRADO (Optimizadísimo para Móvil) */}
      {/* ========================================================================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header Modal de Cobro */}
            <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    Cobrar {currentMesa.numero}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Total: <span className="text-emerald-400 font-bold">${totalUsd.toFixed(2)}</span> (~{totalVes.toFixed(2)} Bs)
                  </p>
                </div>
              </div>

              {/* Selector de Modo: Contado vs CxC */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCheckoutMode('contado')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    checkoutMode === 'contado' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutMode('cxc')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    checkoutMode === 'cxc' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Crédito / CxC
                </button>
              </div>
            </div>

            {/* Cuerpo del Cobro Táctil */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {checkoutMode === 'contado' ? (
                <>
                  {/* Barra de Balance Dinámico */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Cuenta</span>
                      <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white">${totalUsd.toFixed(2)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Abonado</span>
                      <span className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400">${totalPagadoUsd.toFixed(2)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        {saldoRestanteUsd > 0.01 ? 'Por Cobrar' : 'Cambio / Vuelto'}
                      </span>
                      <span className={`font-black text-sm sm:text-base ${
                        saldoRestanteUsd > 0.01 ? 'text-red-500 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {saldoRestanteUsd > 0.01 ? `$${saldoRestanteUsd.toFixed(2)}` : `$${cambioUsd.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Mosaico de Métodos de Pago en 1 Clic */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      1. Selecciona Método(s) de Pago:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {METODOS_PAGO_CONFIG.map(m => {
                        const isActive = pagosLineas.some(p => p.metodo === m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleOrAssignMetodo(m.id, m.nombre)}
                            className={`p-2 rounded-xl text-left border text-xs font-bold transition-all active:scale-95 flex items-center justify-between ${
                              isActive
                                ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span>{m.icono}</span>
                              <span className="truncate">{m.nombre}</span>
                            </span>
                            {isActive && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Panel Dual: Líneas Activas y Teclado Numérico (Numpad) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* Columna Izquierda: Tarjetas de Montos Activos */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        2. Montos por Método:
                      </span>
                      {pagosLineas.map(p => {
                        const isFocused = activePagoIdForNumpad === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setActivePagoIdForNumpad(p.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isFocused
                                ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                {p.metodoNombre}
                              </span>
                              {pagosLineas.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePagoLinea(p.id);
                                  }}
                                  className="text-red-400 hover:text-red-600 p-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">$</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={p.montoUsd || ''}
                                  onChange={e => handleUpdatePagoMonto(p.id, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1 text-sm font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                                ~{p.montoVes.toFixed(2)} Bs
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Billetes Rápidos */}
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Atajos Rápidos:</span>
                        <div className="grid grid-cols-5 gap-1 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => handleQuickBill('exact')}
                            className="py-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                          >
                            Exacto
                          </button>
                          {[10, 20, 50, 100].map(bill => (
                            <button
                              key={bill}
                              type="button"
                              onClick={() => handleQuickBill(bill)}
                              className="py-1 bg-slate-200 dark:bg-slate-700 rounded-lg"
                            >
                              ${bill}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Teclado Numérico Numpad en Pantalla (Crucial para Tablets/Teléfonos) */}
                    <div className="bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                          Teclado Táctil
                        </span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          {pagosLineas.find(p => p.id === activePagoIdForNumpad)?.metodoNombre || 'Monto'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-base font-black">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACK'].map(k => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleNumpadInput(k)}
                            className={`py-3 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                              k === 'BACK'
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 text-xs font-bold'
                                : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            {k === 'BACK' ? 'Borrar' : k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* MODO CARGAR A CUENTAS POR COBRAR (CXC / CRÉDITO) */
                <div className="space-y-3">
                  {currentMesa.cliente.id === 'cli_final' ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <h5 className="font-bold text-xs text-amber-900 dark:text-amber-200">Cliente No Registrado</h5>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Para otorgar crédito debes asociar un cliente con RIF o Cédula.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0"
                      >
                        Seleccionar Cliente
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Titular del Crédito:</span>
                        <h4 className="font-black text-sm text-blue-900 dark:text-blue-100">{currentMesa.cliente.name}</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">RIF/CI: {currentMesa.cliente.taxId}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-xs font-bold text-blue-700 underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Plazo de Crédito:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[7, 15, 30].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setCreditDays(d);
                              const dt = new Date();
                              dt.setDate(dt.getDate() + d);
                              setCreditDueDate(dt.toISOString().split('T')[0]);
                            }}
                            className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              creditDays === d
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Fecha Vencimiento:
                      </label>
                      <input
                        type="date"
                        value={creditDueDate}
                        onChange={e => setCreditDueDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Concepto o Motivo del Crédito:
                    </label>
                    <input
                      type="text"
                      value={creditNotas}
                      onChange={e => setCreditNotas(e.target.value)}
                      placeholder="Ej. Consumo Restaurante Mesa 1 - Autorizado por Gerencia"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal de Cobro */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing || (checkoutMode === 'contado' && saldoRestanteUsd > 0.01) || (checkoutMode === 'cxc' && currentMesa.cliente.id === 'cli_final')}
                onClick={handleFinalizeSale}
                className={`px-5 py-2.5 text-xs sm:text-sm font-black text-white rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                  checkoutMode === 'cxc'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'Procesando...'
                    : checkoutMode === 'cxc'
                    ? `Confirmar CxC ($${totalUsd.toFixed(2)})`
                    : `Finalizar Cobro ($${totalUsd.toFixed(2)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SELECCIONAR CLIENTE */}
      {/* ========================================================================= */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Seleccionar Cliente</h4>
              <button onClick={() => setIsClientModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Buscar por nombre, RIF o teléfono..."
              className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <button
                type="button"
                onClick={() => {
                  updateCurrentMesa(m => ({ ...m, cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' } }));
                  setIsClientModalOpen(false);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-left text-xs"
              >
                <div className="font-bold text-slate-900 dark:text-white">Consumidor Final</div>
                <div className="text-[10px] text-slate-400">V-00000000</div>
              </button>

              {contactos
                .filter(c => !c.tipo || c.tipo === 'cliente' || c.tipo === 'ambos')
                .filter(c => {
                  if (!clientSearch.trim()) return true;
                  const q = clientSearch.toLowerCase();
                  return (
                    c.nombre?.toLowerCase().includes(q) ||
                    c.razonSocial?.toLowerCase().includes(q) ||
                    c.rif?.toLowerCase().includes(q) ||
                    c.telefono?.toLowerCase().includes(q)
                  );
                })
                .slice(0, 20)
                .map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      updateCurrentMesa(m => ({
                        ...m,
                        cliente: {
                          id: c.id,
                          name: c.nombre || c.razonSocial || 'Cliente',
                          taxId: c.rif || c.cedula || 'V-00000000',
                          phone: c.telefono,
                          address: c.direccion
                        }
                      }));
                      setIsClientModalOpen(false);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-800 text-left text-xs"
                  >
                    <div className="font-bold text-slate-900 dark:text-white">{c.nombre || c.razonSocial}</div>
                    <div className="text-[10px] text-slate-400">{c.rif || c.cedula} {c.telefono ? `• ${c.telefono}` : ''}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TRANSFERIR / MOVER MESA */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-amber-500" />
                Transferir Comanda
              </h4>
              <button onClick={() => setIsTransferModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecciona la mesa a la cual mover los consumos actuales de la {currentMesa.numero}:
            </p>

            <select
              value={transferTargetMesaId}
              onChange={e => setTransferTargetMesaId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="">Seleccionar mesa destino...</option>
              {mesas
                .filter(m => m.id !== activeMesaId)
                .map(m => (
                  <option key={m.id} value={m.id}>
                    {m.numero} ({m.zona}) - {m.estado.toUpperCase()}
                  </option>
                ))}
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!transferTargetMesaId}
                onClick={handleTransferMesa}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl disabled:opacity-40"
              >
                Confirmar Traslado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NOTA DE COCINA POR ÍTEM */}
      {/* ========================================================================= */}
      {isItemNoteModalOpen && activeItemForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                Nota de Cocina
              </h4>
              <button onClick={() => setIsItemNoteModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {activeItemForNote.nombre}
            </p>

            {/* Atajos de notas comunes */}
            <div className="flex flex-wrap gap-1">
              {['Sin cebolla', 'Término medio', 'Bien cocido', 'Poco picante', 'Para llevar', 'Sin hielo', 'Salsa aparte'].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTempItemNote(prev => prev ? `${prev}, ${n}` : n)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                >
                  +{n}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={tempItemNote}
              onChange={e => setTempItemNote(e.target.value)}
              placeholder="Instrucciones para la cocina..."
              className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsItemNoteModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItemNote}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL VISTA PREVIA IMPRESIÓN TICKET / PRE-CUENTA */}
      {/* ========================================================================= */}
      {isPrintTicketOpen && facturaFinalizada && (
        <PrintPreview
          isOpen={isPrintTicketOpen}
          onClose={() => {
            setIsPrintTicketOpen(false);
            setFacturaFinalizada(null);
          }}
          title={isPreCuentaPrint ? `Pre-Cuenta ${facturaFinalizada.mesa}` : `Ticket ${facturaFinalizada.numero}`}
        >
          <PosTicketPrint
            factura={facturaFinalizada}
            empresa={empresa}
            isPreCuenta={isPreCuentaPrint}
          />
        </PrintPreview>
      )}

    </div>
  );
};

export default PosRestaurant;
