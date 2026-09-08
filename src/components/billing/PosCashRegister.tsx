import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  DollarSign, RefreshCw, Printer, CheckCircle, User, AlertCircle, 
  ArrowRight, X, Sparkles, Tag, Layers, Check, UtensilsCrossed, 
  Users, Clock, ArrowLeft, ArrowUpDown, ChevronRight, LayoutGrid, 
  Receipt, Calendar, ShieldCheck, ArrowDownLeft, FileText, ChevronDown
} from 'lucide-react';
import { 
  dbSaveFacturaVenta, 
  incrementCorrelativo, 
  dbSaveComprobante, 
  dbSaveCxc 
} from '../../services/db';
import PosTicketPrint from './PosTicketPrint';
import { PrintPreview } from '../PrintPreview';

export interface MesaRestaurant {
  id: string;
  numero: string;
  zona: string; // 'Salón' | 'Terraza' | 'Barra' | 'Para Llevar' | 'Delivery' | string
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

interface PosCashRegisterProps {
  servicios: any[];
  contactos: any[];
  bancos: any[];
  cuentasContables?: any[];
  configContable: any;
  empresa: any;
  onSave?: (collection: string, data: any) => Promise<any> | void;
  reloadCxc?: () => Promise<void>;
  reloadComprobantes?: () => Promise<void>;
  onSaleCompleted?: (factura: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_MESAS: MesaRestaurant[] = [
  { id: 'm1', numero: 'Mesa 1', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm2', numero: 'Mesa 2', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm3', numero: 'Mesa 3', zona: 'Salón', capacidad: 6, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 4 },
  { id: 'm4', numero: 'Mesa 4', zona: 'Salón', capacidad: 2, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm5', numero: 'Mesa 5', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm6', numero: 'Mesa 6', zona: 'Salón', capacidad: 8, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 6 },
  { id: 'm7', numero: 'Mesa 7', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'm8', numero: 'Mesa 8', zona: 'Salón', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 't1', numero: 'Terraza 1', zona: 'Terraza', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 't2', numero: 'Terraza 2', zona: 'Terraza', capacidad: 4, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 't3', numero: 'Terraza 3', zona: 'Terraza', capacidad: 6, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 4 },
  { id: 't4', numero: 'Terraza 4', zona: 'Terraza', capacidad: 2, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 2 },
  { id: 'b1', numero: 'Barra 1', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'b2', numero: 'Barra 2', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'b3', numero: 'Barra 3', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'b4', numero: 'Barra 4', zona: 'Barra', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'd1', numero: 'Para Llevar 1', zona: 'Para Llevar', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 },
  { id: 'd2', numero: 'Delivery 1', zona: 'Delivery', capacidad: 1, estado: 'libre', cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, cart: [], mesero: '', personas: 1 }
];

export const PosCashRegister: React.FC<PosCashRegisterProps> = ({
  servicios = [],
  contactos = [],
  bancos = [],
  cuentasContables = [],
  configContable = {} as any,
  empresa,
  onSave,
  reloadCxc,
  reloadComprobantes,
  onSaleCompleted,
  showToast
}) => {
  const cid = empresa?.id || 'default';
  const mesasStorageKey = `erp_restaurant_mesas_${cid}`;

  const prefijo = configContable?.prefijoFactura || '';
  const correlativoConfig = configContable?.correlativoFactura || '00001';
  const numeroTicket = `${prefijo}${correlativoConfig}`;

  const [tasaCambio, setTasaCambio] = useState<number>(() => {
    const bConTasa = bancos.find(b => Number(b.tasa) > 1);
    return bConTasa ? Number(bConTasa.tasa) : 36.50;
  });

  const [mesas, setMesas] = useState<MesaRestaurant[]>(() => {
    try {
      const saved = localStorage.getItem(mesasStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_MESAS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(mesasStorageKey, JSON.stringify(mesas));
    } catch (e) {
      console.warn('Error saving mesas to localStorage:', e);
    }
  }, [mesas, mesasStorageKey]);

  const [activeView, setActiveView] = useState<'mesas' | 'comanda'>('mesas');
  const [activeMesaId, setActiveMesaId] = useState<string>(mesas[0]?.id || 'm1');
  const [filterZona, setFilterZona] = useState<string>('todas');

  const currentMesa = useMemo(() => {
    return mesas.find(m => m.id === activeMesaId) || mesas[0];
  }, [mesas, activeMesaId]);

  const cart = currentMesa?.cart || [];
  const selectedCliente = currentMesa?.cliente || { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' };

  const [searchTerm, setSearchTerm] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'contado' | 'cxc'>('contado');
  const [pagosList, setPagosList] = useState<PagoLinea[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [metodoToAdd, setMetodoToAdd] = useState<string>('efectivo');
  const [montoUsdToAdd, setMontoUsdToAdd] = useState<number | string>('');
  const [montoVesToAdd, setMontoVesToAdd] = useState<number | string>('');
  const [bancoToAdd, setBancoToAdd] = useState<string>(bancos[0]?.id || '');
  const [refToAdd, setRefToAdd] = useState<string>('');

  const [creditDays, setCreditDays] = useState<number>(15);
  const [creditDueDate, setCreditDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [creditNotas, setCreditNotas] = useState<string>('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetMesaId, setTransferTargetMesaId] = useState<string>('');

  const [isAddMesaModalOpen, setIsAddMesaModalOpen] = useState(false);
  const [newMesaNumero, setNewMesaNumero] = useState('');
  const [newMesaZona, setNewMesaZona] = useState('Salón');
  const [newMesaCapacidad, setNewMesaCapacidad] = useState(4);

  const [lastSaleForPrint, setLastSaleForPrint] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const clientesList = useMemo(() => {
    return contactos.filter(c => c.type === 'customer' || c.type === 'both');
  }, [contactos]);

  const clientesFiltrados = useMemo(() => {
    if (!clientSearchTerm) return clientesList.slice(0, 15);
    const term = clientSearchTerm.toLowerCase();
    return clientesList.filter(c => 
      (c.name || '').toLowerCase().includes(term) || 
      (c.taxId || '').toLowerCase().includes(term)
    );
  }, [clientesList, clientSearchTerm]);

  const serviciosFiltrados = useMemo(() => {
    return servicios.filter(s => {
      const matchText = (s.nombre || s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchText;
    });
  }, [servicios, searchTerm]);

  const metricasRestaurante = useMemo(() => {
    const totalMesas = mesas.length;
    let ocupadas = 0;
    let libres = 0;
    let porPagar = 0;
    let totalVentaActivaUsd = 0;

    mesas.forEach(m => {
      if (m.estado === 'libre') libres++;
      if (m.estado === 'ocupada') ocupadas++;
      if (m.estado === 'cuenta') porPagar++;

      const subtotalMesa = (m.cart || []).reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
      totalVentaActivaUsd += subtotalMesa;
    });

    return {
      totalMesas,
      ocupadas,
      libres,
      porPagar,
      totalVentaActivaUsd,
      totalVentaActivaVes: totalVentaActivaUsd * tasaCambio
    };
  }, [mesas, tasaCambio]);

  const { subtotal, montoExento, baseImponible, ivaMonto, totalUsd, totalVes } = useMemo(() => {
    let sub = 0;
    let exento = 0;
    let gravable = 0;

    cart.forEach(item => {
      const lineTotal = item.cantidad * item.precioUnitario;
      sub += lineTotal;
      if (item.exento) exento += lineTotal;
      else gravable += lineTotal;
    });

    const ivaPorc = Number(configContable?.iva || 16) / 100;
    const iva = gravable * ivaPorc;
    const total = sub + iva;
    const ves = total * tasaCambio;

    return {
      subtotal: sub,
      montoExento: exento,
      baseImponible: gravable,
      ivaMonto: iva,
      totalUsd: total,
      totalVes: ves
    };
  }, [cart, configContable?.iva, tasaCambio]);

  const updateCurrentMesa = (updater: (mesa: MesaRestaurant) => MesaRestaurant) => {
    setMesas(prev => prev.map(m => (m.id === activeMesaId ? updater(m) : m)));
  };

  const addToCart = (servicio: any) => {
    updateCurrentMesa(m => {
      const existing = m.cart.find(item => item.id === servicio.id);
      let newCart;
      if (existing) {
        newCart = m.cart.map(item =>
          item.id === servicio.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      } else {
        newCart = [
          ...m.cart,
          {
            id: servicio.id,
            nombre: servicio.nombre || servicio.name,
            descripcion: servicio.descripcion || '',
            precioUnitario: Number(servicio.precioBase || servicio.precio || 0),
            cantidad: 1,
            exento: Boolean(servicio.exentoIva),
            notas: ''
          }
        ];
      }
      return {
        ...m,
        cart: newCart,
        estado: m.estado === 'libre' ? 'ocupada' : m.estado,
        openedAt: m.openedAt || new Date().toISOString()
      };
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    updateCurrentMesa(m => {
      const newCart = m.cart
        .map(item => {
          if (item.id === id) {
            const nuevaCant = item.cantidad + delta;
            return nuevaCant > 0 ? { ...item, cantidad: nuevaCant } : null;
          }
          return item;
        })
        .filter(Boolean) as any[];

      return {
        ...m,
        cart: newCart,
        estado: newCart.length === 0 ? 'libre' : m.estado,
        openedAt: newCart.length === 0 ? undefined : m.openedAt
      };
    });
  };

  const removeFromCart = (id: string) => {
    updateCurrentMesa(m => {
      const newCart = m.cart.filter(item => item.id !== id);
      return {
        ...m,
        cart: newCart,
        estado: newCart.length === 0 ? 'libre' : m.estado,
        openedAt: newCart.length === 0 ? undefined : m.openedAt
      };
    });
  };

  const clearCurrentMesa = () => {
    if (confirm(`¿Estás seguro de cancelar y liberar la ${currentMesa.numero}?`)) {
      updateCurrentMesa(m => ({
        ...m,
        cart: [],
        estado: 'libre',
        openedAt: undefined,
        cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' },
        mesero: '',
        notas: ''
      }));
      if (showToast) showToast(`${currentMesa.numero} ha sido liberada`, 'info');
    }
  };

  const setMesaStatus = (status: 'libre' | 'ocupada' | 'cuenta') => {
    updateCurrentMesa(m => ({ ...m, estado: status }));
  };

  const handlePrintPreCuenta = () => {
    if (cart.length === 0) {
      if (showToast) showToast('La mesa no tiene ítems agregados', 'error');
      return;
    }

    const preCuentaData = {
      numero: `PRE-${currentMesa.numero.replace(/\s+/g, '')}`,
      tipoDocumento: 'pre_cuenta',
      mesa: currentMesa.numero,
      zonaMesa: currentMesa.zona,
      mesero: currentMesa.mesero || 'Mesero',
      personas: currentMesa.personas || 2,
      clienteNombre: selectedCliente.name,
      clienteRif: selectedCliente.taxId,
      clienteTelefono: selectedCliente.phone || '',
      fechaEmision: new Date().toISOString().split('T')[0],
      moneda: 'USD',
      tasaCambio,
      subtotal,
      baseImponible,
      montoExento,
      ivaPorcentaje: Number(configContable?.iva || 16),
      ivaMonto,
      total: totalUsd,
      estado: 'Por Pagar',
      detalles: cart,
      esPos: true
    };

    setMesaStatus('cuenta');
    setLastSaleForPrint(preCuentaData);
    setIsPrintModalOpen(true);
  };

  const handleTransferMesa = () => {
    if (!transferTargetMesaId || transferTargetMesaId === activeMesaId) {
      if (showToast) showToast('Selecciona una mesa de destino válida', 'error');
      return;
    }

    const targetMesa = mesas.find(m => m.id === transferTargetMesaId);
    if (!targetMesa) return;

    if (targetMesa.cart.length > 0) {
      if (!confirm(`La ${targetMesa.numero} ya tiene una comanda activa. ¿Deseas unificar ambas comandas?`)) {
        return;
      }
    }

    setMesas(prev => {
      const source = prev.find(m => m.id === activeMesaId);
      if (!source) return prev;

      return prev.map(m => {
        if (m.id === transferTargetMesaId) {
          return {
            ...m,
            cart: [...m.cart, ...source.cart],
            cliente: source.cliente.id !== 'cli_final' ? source.cliente : m.cliente,
            mesero: source.mesero || m.mesero,
            personas: (m.personas || 2) + (source.personas || 2),
            estado: 'ocupada',
            openedAt: m.openedAt || source.openedAt || new Date().toISOString()
          };
        }
        if (m.id === activeMesaId) {
          return {
            ...m,
            cart: [],
            estado: 'libre',
            cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' },
            mesero: '',
            openedAt: undefined
          };
        }
        return m;
      });
    });

    if (showToast) showToast(`Comanda transferida a ${targetMesa.numero}`, 'success');
    setActiveMesaId(transferTargetMesaId);
    setIsTransferModalOpen(false);
  };

  const handleAddNewMesa = () => {
    if (!newMesaNumero.trim()) {
      if (showToast) showToast('Ingresa el identificador de la mesa', 'error');
      return;
    }
    const newId = `m_custom_${Date.now()}`;
    const newMesa: MesaRestaurant = {
      id: newId,
      numero: newMesaNumero.trim(),
      zona: newMesaZona,
      capacidad: Number(newMesaCapacidad) || 4,
      estado: 'libre',
      cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' },
      cart: [],
      mesero: '',
      personas: 2
    };

    setMesas(prev => [...prev, newMesa]);
    setNewMesaNumero('');
    setIsAddMesaModalOpen(false);
    if (showToast) showToast(`Mesa ${newMesa.numero} agregada con éxito`, 'success');
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      if (showToast) showToast('La mesa no tiene consumos para cobrar', 'error');
      return;
    }
    setCheckoutMode('contado');
    setPagosList([
      {
        id: `p_${Date.now()}`,
        metodo: 'efectivo',
        metodoNombre: 'Efectivo USD',
        montoUsd: totalUsd,
        montoVes: totalVes,
        bancoId: bancos[0]?.id || '',
        referencia: ''
      }
    ]);
    setCreditNotas(`Consumo Restaurante - ${currentMesa.numero} (${currentMesa.zona}) - ${selectedCliente.name}`);
    setIsCheckoutOpen(true);
  };

  const totalAbonadoUsd = useMemo(() => {
    return pagosList.reduce((sum, p) => sum + Number(p.montoUsd || 0), 0);
  }, [pagosList]);

  const totalAbonadoVes = totalAbonadoUsd * tasaCambio;
  const saldoRestanteUsd = Math.max(0, Number((totalUsd - totalAbonadoUsd).toFixed(2)));
  const saldoRestanteVes = saldoRestanteUsd * tasaCambio;
  const vueltoUsd = Math.max(0, Number((totalAbonadoUsd - totalUsd).toFixed(2)));
  const vueltoVes = vueltoUsd * tasaCambio;

  const handleMontoUsdChange = (val: string) => {
    setMontoUsdToAdd(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setMontoVesToAdd((num * tasaCambio).toFixed(2));
    else setMontoVesToAdd('');
  };

  const handleMontoVesChange = (val: string) => {
    setMontoVesToAdd(val);
    const num = parseFloat(val);
    if (!isNaN(num) && tasaCambio > 0) setMontoUsdToAdd((num / tasaCambio).toFixed(2));
    else setMontoUsdToAdd('');
  };

  const METODOS_PAGO = [
    { id: 'efectivo', label: 'Efectivo USD ($)', icon: '💵' },
    { id: 'punto_debito', label: 'Punto / Tarjeta Débito', icon: '💳' },
    { id: 'pago_movil', label: 'Pago Móvil (Bs)', icon: '📱' },
    { id: 'zelle', label: 'Zelle ($)', icon: '💎' },
    { id: 'efectivo_ves', label: 'Efectivo Bs', icon: '🇻🇪' },
    { id: 'transferencia', label: 'Transferencia', icon: '🏦' },
    { id: 'tarjeta_int', label: 'Tarjeta Int.', icon: '🌐' }
  ];

  // Tocar un método asigna automáticamente el saldo restante en un solo paso
  const handleToggleOrAssignMetodo = (metodoId: string) => {
    const metObj = METODOS_PAGO.find(m => m.id === metodoId);

    // Si solo hay un pago y cubría el 100%, cambiar de método directamente en 1 toque
    if (pagosList.length === 1 && pagosList[0].montoUsd === totalUsd && pagosList[0].metodo !== metodoId) {
      setPagosList([
        {
          id: `p_${Date.now()}`,
          metodo: metodoId,
          metodoNombre: metObj?.label || metodoId,
          montoUsd: totalUsd,
          montoVes: totalVes,
          bancoId: bancos[0]?.id || '',
          referencia: ''
        }
      ]);
      return;
    }

    const existingIdx = pagosList.findIndex(p => p.metodo === metodoId);

    // Calcular cuánto falta por cubrir sumando los otros métodos
    const otrosPagosTotal = pagosList
      .filter(p => p.metodo !== metodoId)
      .reduce((sum, p) => sum + Number(p.montoUsd || 0), 0);

    const restanteParaEste = Math.max(0, Number((totalUsd - otrosPagosTotal).toFixed(2)));
    const montoAsignar = restanteParaEste > 0 ? restanteParaEste : (pagosList.length === 0 ? totalUsd : 0);

    if (existingIdx >= 0) {
      // Si ya estaba en la lista, reasignar el saldo restante si faltaba dinero
      if (restanteParaEste > 0) {
        setPagosList(prev => prev.map((p, idx) => 
          idx === existingIdx ? {
            ...p,
            montoUsd: montoAsignar,
            montoVes: Number((montoAsignar * tasaCambio).toFixed(2))
          } : p
        ));
      }
    } else {
      // Agregar el nuevo método asignándole automáticamente el monto restante exacto
      const newPago: PagoLinea = {
        id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        metodo: metodoId,
        metodoNombre: metObj?.label || metodoId,
        montoUsd: montoAsignar,
        montoVes: Number((montoAsignar * tasaCambio).toFixed(2)),
        bancoId: bancos[0]?.id || '',
        referencia: ''
      };
      setPagosList(prev => [...prev, newPago]);
    }
  };

  // Modificar monto directamente en la fila del método
  const handleUpdatePagoMonto = (id: string, nuevoMontoUsd: number) => {
    const safeMonto = isNaN(nuevoMontoUsd) || nuevoMontoUsd < 0 ? 0 : Number(nuevoMontoUsd.toFixed(2));
    setPagosList(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          montoUsd: safeMonto,
          montoVes: Number((safeMonto * tasaCambio).toFixed(2))
        };
      }
      return p;
    }));
  };

  const handleUpdatePagoField = (id: string, field: 'bancoId' | 'referencia', val: string) => {
    setPagosList(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleRemovePagoLinea = (id: string) => {
    setPagosList(prev => prev.filter(p => p.id !== id));
  };

  const handleQuickPayFull = (metodoId: string) => {
    const metObj = METODOS_PAGO.find(m => m.id === metodoId);
    setPagosList([
      {
        id: `p_${Date.now()}`,
        metodo: metodoId,
        metodoNombre: metObj?.label || metodoId,
        montoUsd: totalUsd,
        montoVes: totalVes,
        bancoId: bancos[0]?.id || '',
        referencia: ''
      }
    ]);
  };

  const findCuentaId = (ref: string, fallbackCode: string): string => {
    if (!cuentasContables || cuentasContables.length === 0) return ref || fallbackCode;
    const exact = cuentasContables.find(c => c.id === ref || c.codigo === ref);
    if (exact) return exact.id;
    const byCode = cuentasContables.find(c => c.codigo?.startsWith(ref) || c.codigo?.startsWith(fallbackCode));
    return byCode ? byCode.id : ref || fallbackCode;
  };

  const generarComprobanteContable = async (isCredito: boolean, facturaNumero: string, descripcion: string) => {
    const fecha = new Date().toISOString().split('T')[0];
    const lineas: any[] = [];

    if (isCredito) {
      const cxcCuentaId = findCuentaId(configContable?.cuentaCxc || '1.1.03.01', '1.1.03');
      lineas.push({ id: `l-cxc-${Date.now()}`, cuentaId: cxcCuentaId, descripcion, debe: totalUsd, haber: 0 });
    } else {
      pagosList.forEach((pago, pIdx) => {
        const bancoObj = bancos.find(b => b.id === pago.bancoId);
        const cuentaRef = bancoObj?.cuentaContableId || (pago.metodo.includes('efectivo') ? (configContable?.cuentaCajaChica || '1.1.01.01') : (configContable?.cuentaBancos || '1.1.02.01'));
        const cuentaId = findCuentaId(cuentaRef, pago.metodo.includes('efectivo') ? '1.1.01' : '1.1.02');
        lineas.push({ id: `l-pago-${Date.now()}-${pIdx}`, cuentaId, descripcion: `${descripcion} (${pago.metodoNombre}${pago.referencia ? ` Ref:${pago.referencia}` : ''})`, debe: pago.montoUsd, haber: 0 });
      });
    }

    const ingresoCuentaId = findCuentaId(configContable?.cuentaIngresos || '4.1.01.01', '4.1.01');
    lineas.push({ id: `l-ing-${Date.now()}`, cuentaId: ingresoCuentaId, descripcion, debe: 0, haber: subtotal });

    if (ivaMonto > 0) {
      const ivaCuentaId = findCuentaId(configContable?.cuentaDebitoFiscal || '2.1.04.01', '2.1.04');
      lineas.push({ id: `l-iva-${Date.now()}`, cuentaId: ivaCuentaId, descripcion, debe: 0, haber: ivaMonto });
    }

    const tDebe = lineas.reduce((acc, curr) => acc + (Number(curr.debe) || 0), 0);
    const tHaber = lineas.reduce((acc, curr) => acc + (Number(curr.haber) || 0), 0);
    const isBalanced = Math.abs(tDebe - tHaber) < 0.01;

    const comprobanteData = {
      id: `comp_pos_${Date.now()}`,
      numero: `CMP-${Date.now().toString().slice(-6)}`,
      fecha,
      tipo: 'Ingreso',
      descripcion,
      referencia: facturaNumero,
      total: Math.max(tDebe, tHaber),
      estado: isBalanced ? 'Contabilizado' : 'Descuadrado',
      lineas
    };

    try {
      await dbSaveComprobante(comprobanteData, cid);
      if (onSave) await onSave('comprobantes', comprobanteData);
      if (reloadComprobantes) await reloadComprobantes();
    } catch (err) { console.warn(err); }
    return comprobanteData.id;
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0 || totalUsd <= 0) return;
    if (checkoutMode === 'contado' && saldoRestanteUsd > 0.01) {
      if (showToast) showToast(`Falta por cubrir $${saldoRestanteUsd.toFixed(2)}`, 'error');
      return;
    }
    if (checkoutMode === 'cxc' && selectedCliente.id === 'cli_final') {
      if (showToast) showToast('Selecciona un cliente para crédito', 'error');
      setIsClientModalOpen(true);
      return;
    }

    setIsProcessing(true);
    try {
      const isCredito = checkoutMode === 'cxc';
      const fechaHoy = new Date().toISOString().split('T')[0];
      const descripcionVenta = isCredito ? `Consumo a Crédito: ${currentMesa.numero}` : `Venta POS Restaurante: ${currentMesa.numero}`;
      const compId = await generarComprobanteContable(isCredito, numeroTicket, descripcionVenta);

      const facturaData: any = {
        numero: numeroTicket,
        tipoDocumento: 'ticket_pos',
        clienteId: selectedCliente.id,
        clienteNombre: selectedCliente.name,
        clienteRif: selectedCliente.taxId,
        clienteTelefono: selectedCliente.phone || '',
        clienteDireccion: selectedCliente.address || '',
        mesa: currentMesa.numero,
        zonaMesa: currentMesa.zona,
        mesero: currentMesa.mesero || '',
        personas: currentMesa.personas || 2,
        fechaEmision: fechaHoy,
        fechaVencimiento: isCredito ? creditDueDate : fechaHoy,
        moneda: 'USD',
        tasaCambio,
        subtotal,
        baseImponible,
        montoExento,
        ivaPorcentaje: Number(configContable?.iva || 16),
        ivaMonto,
        total: totalUsd,
        saldoPendiente: isCredito ? totalUsd : 0,
        estado: isCredito ? 'Pendiente' : 'Cobrada',
        terminoPago: isCredito ? 'credito' : 'contado',
        metodoPago: isCredito ? 'credito' : (pagosList.length === 1 ? pagosList[0].metodo : 'mixto'),
        pagosDetalle: isCredito ? [] : pagosList,
        bancoId: !isCredito && pagosList[0]?.bancoId ? pagosList[0].bancoId : null,
        montoPagado: isCredito ? 0 : totalAbonadoUsd,
        vuelto: isCredito ? 0 : vueltoUsd,
        esPos: true,
        comprobanteId: compId,
        detalles: cart,
        notas: isCredito ? creditNotas : (pagosList.map(p => `${p.metodoNombre}: $${p.montoUsd}`).join(' | '))
      };

      const res = await dbSaveFacturaVenta(facturaData, cid);
      if (res.success) {
        if (isCredito && res.cxc && onSave) await onSave('cxc', res.cxc);
        if (reloadCxc) await reloadCxc();

        updateCurrentMesa(m => ({ ...m, cart: [], estado: 'libre', openedAt: undefined, cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' }, mesero: '', notas: '' }));
        setLastSaleForPrint(res.data);
        setIsCheckoutOpen(false);
        setIsPrintModalOpen(true);
        if (onSaleCompleted) onSaleCompleted(res.data);
      } else showToast('Error al procesar la venta', 'error');
    } catch (err: any) { showToast(err?.message || 'Error', 'error'); } 
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[620px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setActiveView('mesas')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'mesas' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <LayoutGrid className="w-4 h-4" />
            <span>Mesas y Salón</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold">{metricasRestaurante.ocupadas}/{metricasRestaurante.totalMesas}</span>
          </button>
          <button type="button" onClick={() => setActiveView('comanda')} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'comanda' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            <UtensilsCrossed className="w-4 h-4" />
            <span>Comanda: {currentMesa?.numero}</span>
            {cart.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">${totalUsd.toFixed(2)}</span>}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800/50 font-bold">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tasa BCV:</span>
            <input type="number" step="0.01" value={tasaCambio} onChange={e => setTasaCambio(Number(e.target.value))} className="w-16 bg-transparent text-right font-black focus:outline-none border-b border-emerald-400" />
            <span>Bs/$</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
            Ticket: <span className="text-emerald-600 dark:text-emerald-400 font-black">{numeroTicket}</span>
          </div>
        </div>
      </div>

      {activeView === 'mesas' && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Total Mesas</p><p className="text-xl font-black text-slate-800 dark:text-white">{metricasRestaurante.totalMesas}</p></div>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500"><LayoutGrid className="w-5 h-5" /></div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Ocupadas</p><p className="text-xl font-black text-blue-700 dark:text-blue-300">{metricasRestaurante.ocupadas}</p></div>
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400"><UtensilsCrossed className="w-5 h-5" /></div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Libres</p><p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{metricasRestaurante.libres}</p></div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-5 h-5" /></div>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-xs flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Por Cobrar</p><p className="text-xl font-black text-amber-700 dark:text-amber-300">{metricasRestaurante.porPagar}</p></div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400"><Receipt className="w-5 h-5" /></div>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-md col-span-2 sm:col-span-1 flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-emerald-100 uppercase">Venta en Salón</p><p className="text-xl font-black">${metricasRestaurante.totalVentaActivaUsd.toFixed(2)}</p></div>
              <DollarSign className="w-6 h-6 text-white/80" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'todas', label: 'Todas las Mesas' },
                { id: 'Salón', label: 'Salón' },
                { id: 'Terraza', label: 'Terraza' },
                { id: 'Barra', label: 'Barra' },
                { id: 'Para Llevar', label: 'Para Llevar / Delivery' },
                { id: 'ocupadas', label: '🔵 Solo Ocupadas' },
                { id: 'libres', label: '🟢 Solo Libres' },
                { id: 'cuenta', label: '🟡 Pidiendo Cuenta' }
              ].map(f => (
                <button key={f.id} type="button" onClick={() => setFilterZona(f.id)} className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${filterZona === f.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'}`}>{f.label}</button>
              ))}
            </div>
            <button type="button" onClick={() => setIsAddMesaModalOpen(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs"><Plus className="w-3.5 h-3.5" /><span>Nueva Mesa</span></button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
              {mesas
                .filter(m => {
                  if (filterZona === 'todas') return true;
                  if (filterZona === 'ocupadas') return m.estado === 'ocupada';
                  if (filterZona === 'libres') return m.estado === 'libre';
                  if (filterZona === 'cuenta') return m.estado === 'cuenta';
                  if (filterZona === 'Para Llevar') return m.zona === 'Para Llevar' || m.zona === 'Delivery';
                  return m.zona === filterZona;
                })
                .map(mesa => {
                  const itemsCount = mesa.cart.reduce((sum, i) => sum + i.cantidad, 0);
                  const subTotalMesa = mesa.cart.reduce((sum, i) => sum + (i.cantidad * i.precioUnitario), 0);
                  const isLibre = mesa.estado === 'libre';
                  const isCuenta = mesa.estado === 'cuenta';
                  const isOcupada = mesa.estado === 'ocupada';
                  return (
                    <div key={mesa.id} onClick={() => { setActiveMesaId(mesa.id); setActiveView('comanda'); }} className={`cursor-pointer group relative flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${isCuenta ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500' : isOcupada ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{mesa.zona}</span><h4 className="text-base font-black text-slate-900 dark:text-white">{mesa.numero}</h4></div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isCuenta ? 'bg-amber-500 text-white animate-pulse' : isOcupada ? 'bg-blue-600 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>{isCuenta ? 'Por Pagar' : isOcupada ? 'Ocupada' : 'Libre'}</span>
                      </div>
                      <div className="space-y-1.5 my-2">
                        {isLibre ? (<div className="text-xs text-slate-400 flex items-center gap-1.5 py-3"><Users className="w-3.5 h-3.5 text-slate-300" /><span>Capacidad: {mesa.capacidad} pers.</span></div>) : (
                          <><div className="flex justify-between items-center text-xs"><span className="text-slate-500 font-semibold">{itemsCount} plato(s)</span><span className="font-black text-slate-900 dark:text-white text-sm">${subTotalMesa.toFixed(2)}</span></div>
                          {mesa.cliente?.name && mesa.cliente.name !== 'Consumidor Final' && (<div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">👤 {mesa.cliente.name}</div>)}</>
                        )}
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 group-hover:text-emerald-600 font-bold flex items-center gap-1">{isLibre ? 'Tomar Orden' : 'Ver Comanda'}<ChevronRight className="w-3.5 h-3.5" /></span>
                        {isCuenta && (<span className="text-amber-600 font-bold text-[10px] flex items-center gap-0.5"><Receipt className="w-3 h-3" /> Cuenta</span>)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {activeView === 'comanda' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar plato, bebida..." className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 shadow-xs" />
              </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {serviciosFiltrados.map(srv => {
                  const precio = Number(srv.precioBase || srv.precio || 0);
                  return (
                    <button key={srv.id} type="button" onClick={() => addToCart(srv)} className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex flex-col justify-between group">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-emerald-700">{srv.nombre || srv.name}</h5>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-2">${precio.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-[420px] flex flex-col bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 shadow-lg">
            {/* Encabezado de la Mesa Activa */}
            <div className="p-3.5 bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('mesas')}
                    className="p-1 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white"
                    title="Volver a ver todas las mesas"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-sm font-black flex items-center gap-1.5">
                      <span>{currentMesa.numero}</span>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700">
                        {currentMesa.zona}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Selector rápido de estado de la mesa */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMesaStatus('libre')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded ${
                      currentMesa.estado === 'libre' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Libre
                  </button>
                  <button
                    type="button"
                    onClick={() => setMesaStatus('ocupada')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded ${
                      currentMesa.estado === 'ocupada' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Ocupada
                  </button>
                  <button
                    type="button"
                    onClick={() => setMesaStatus('cuenta')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded ${
                      currentMesa.estado === 'cuenta' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Cuenta
                  </button>
                </div>
              </div>

              {/* Barra de Datos de Servicio: Cliente y Mesero */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
                {/* Cliente Asignado */}
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(true)}
                  className="text-left p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-between"
                >
                  <div className="truncate">
                    <span className="text-[9px] text-slate-400 block">Cliente:</span>
                    <span className="font-bold text-[11px] text-slate-100 truncate block">
                      {selectedCliente.name}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                </button>

                {/* Mesero */}
                <div className="p-1.5 rounded-lg bg-slate-800">
                  <span className="text-[9px] text-slate-400 block">Mesero / Atendido:</span>
                  <input
                    type="text"
                    value={currentMesa.mesero || ''}
                    onChange={e => updateCurrentMesa(m => ({ ...m, mesero: e.target.value }))}
                    placeholder="Nombre mesero..."
                    className="w-full bg-transparent font-bold text-[11px] text-white focus:outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Botones de acción de la mesa: Transferir / Liberar */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const freeMesas = mesas.filter(m => m.id !== activeMesaId);
                    setTransferTargetMesaId(freeMesas[0]?.id || '');
                    setIsTransferModalOpen(true);
                  }}
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Transferir / Mover Mesa</span>
                </button>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCurrentMesa}
                    className="hover:text-red-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Cancelar / Liberar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Ítems de la Comanda */}
            <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 p-6">
                  <ShoppingCart className="w-10 h-10 stroke-[1.5] text-slate-300" />
                  <p className="text-xs font-semibold text-center">La comanda está vacía</p>
                  <p className="text-[11px] text-slate-400 text-center">
                    Selecciona platos o bebidas del menú a la izquierda para agregarlos a la {currentMesa.numero}.
                  </p>
                </div>
              ) : (
                cart.map(item => {
                  const lineTotal = item.cantidad * item.precioUnitario;

                  return (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {item.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ${item.precioUnitario.toFixed(2)} c/u {item.exento ? '(Exento)' : ''}
                        </div>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black w-5 text-center">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Monto de la línea y botón eliminar */}
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-white w-14">
                          ${lineTotal.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Totales y Botones de Pre-Cuenta / Cobro */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                </div>
                {ivaMonto > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>IVA ({Number(configContable?.iva || 16)}%):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">${ivaMonto.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-black text-slate-900 dark:text-white">TOTAL A COBRAR:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ${totalUsd.toFixed(2)}
                    </span>
                    <div className="text-[10px] font-bold text-slate-400">
                      Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handlePrintPreCuenta}
                  className="px-3 py-2.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Pre-Cuenta Mesa</span>
                </button>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleOpenCheckout}
                  className="px-3 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cerrar / Cobrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cobro con Pagos Mixtos y CxC */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-black text-base">Cobro de Cuenta - {currentMesa.numero}</h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {currentMesa.zona} • Cliente: <span className="text-white font-bold">{selectedCliente.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5 text-slate-300 hover:text-white" />
              </button>
            </div>

            {/* Pestañas: Contado vs Cargar a CxC */}
            <div className="px-6 pt-3 pb-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                type="button"
                onClick={() => setCheckoutMode('contado')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  checkoutMode === 'contado'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Cobro Inmediato (Pagos Mixtos)</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckoutMode('cxc')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  checkoutMode === 'cxc'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Cargar a Crédito / Cuenta por Cobrar (CxC)</span>
              </button>
            </div>

            {/* Contenido del Cobro */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Tarjeta de Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Cuenta</span>
                  <p className="text-lg font-black text-slate-900 dark:text-white">${totalUsd.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Bs. {totalVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                </div>

                {checkoutMode === 'contado' ? (
                  <>
                    <div>
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Total Abonado</span>
                      <p className="text-lg font-black text-blue-600 dark:text-blue-400">${totalAbonadoUsd.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Bs. {totalAbonadoVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Restante</span>
                      <p className={`text-lg font-black ${saldoRestanteUsd > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>
                        ${saldoRestanteUsd.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">Bs. {saldoRestanteVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-teal-600 uppercase">Vuelto / Cambio</span>
                      <p className="text-lg font-black text-teal-600 dark:text-teal-400">${vueltoUsd.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Bs. {vueltoVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 flex items-center justify-center p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                    📋 Esta cuenta se registrará a crédito en Cuentas por Cobrar (CxC) con saldo pendiente de ${totalUsd.toFixed(2)}.
                  </div>
                )}
              </div>

              {/* MODO CONTADO / PAGOS MIXTOS */}
              {checkoutMode === 'contado' && (
                <div className="space-y-4">
                  {/* Selector Táctil Directo de Métodos de Pago */}
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      1. Toca un método para asignar el monto restante (o combinar pagos):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {METODOS_PAGO.map(m => {
                        const activePago = pagosList.find(p => p.metodo === m.id);
                        const isAssigned = Boolean(activePago);

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleOrAssignMetodo(m.id)}
                            className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all text-center relative ${
                              isAssigned
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span className="text-xl">{m.icon}</span>
                            <span className="text-[11px] leading-tight">{m.label}</span>
                            {isAssigned && (
                              <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-xs">
                                ${activePago.montoUsd.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estado de Cobertura de la Cuenta */}
                  {saldoRestanteUsd > 0.01 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-900 dark:text-amber-300">
                          Falta por cubrir: <span className="text-sm font-black text-amber-700 dark:text-amber-200">${saldoRestanteUsd.toFixed(2)}</span>
                          <span className="font-normal text-slate-500 ml-1">(Bs. {saldoRestanteVes.toLocaleString('es-VE', { maximumFractionDigits: 2 })})</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        Toca otro método arriba para completar
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>¡Monto de la cuenta completamente cubierto!</span>
                      </div>
                      <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                        ${totalAbonadoUsd.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Vuelto / Cambio si aplica */}
                  {vueltoUsd > 0 && (
                    <div className="p-3 bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 dark:text-teal-200 uppercase">
                        💵 Cambio / Vuelto al Cliente:
                      </span>
                      <div className="text-right">
                        <span className="text-base font-black text-teal-700 dark:text-teal-300">
                          ${vueltoUsd.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 block font-semibold">
                          Bs. {vueltoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Desglose y Ajuste Directo de los Métodos Activos */}
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      2. Métodos de Pago Activos (ajusta montos directamente si es pago dividido):
                    </span>
                    {pagosList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        Toca cualquiera de los métodos de pago arriba para registrar el cobro.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pagosList.map((p) => {
                          const isCash = p.metodo.includes('efectivo');

                          return (
                            <div
                              key={p.id}
                              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold">{p.metodoNombre}</span>
                                </div>

                                {/* Entrada de Monto en USD con conversión automática */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-500">Monto $:</span>
                                  <div className="relative">
                                    <DollarSign className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={p.montoUsd === 0 ? '' : p.montoUsd}
                                      onChange={e => handleUpdatePagoMonto(p.id, parseFloat(e.target.value))}
                                      placeholder="0.00"
                                      className="w-28 pl-6 pr-2 py-1 text-sm font-black bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-right focus:ring-2 focus:ring-emerald-500"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemovePagoLinea(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                                    title="Eliminar forma de pago"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Billetes Rápidos para Efectivo */}
                              {isCash && (
                                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto text-xs">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Billetes:</span>
                                  {[totalUsd, 5, 10, 20, 50, 100].map((val, bIdx) => (
                                    <button
                                      key={bIdx}
                                      type="button"
                                      onClick={() => handleUpdatePagoMonto(p.id, val)}
                                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-slate-600"
                                    >
                                      {val === totalUsd ? 'Exacto' : `$${val}`}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Datos adicionales opcionales: Banco y Referencia */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-medium shrink-0">Caja / Banco:</span>
                                  <select
                                    value={p.bancoId || bancos[0]?.id || ''}
                                    onChange={e => handleUpdatePagoField(p.id, 'bancoId', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                                  >
                                    {bancos.map(b => (
                                      <option key={b.id} value={b.id}>{b.banco || b.nombre}</option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-medium shrink-0">Ref:</span>
                                  <input
                                    type="text"
                                    value={p.referencia || ''}
                                    onChange={e => handleUpdatePagoField(p.id, 'referencia', e.target.value)}
                                    placeholder="Opcional..."
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODO CARGAR A CUENTA POR COBRAR (CXC / CRÉDITO) */}
              {checkoutMode === 'cxc' && (
                <div className="space-y-4">
                  {selectedCliente.id === 'cli_final' ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                          <h5 className="font-bold text-xs text-amber-900 dark:text-amber-300">Cliente No Identificado</h5>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Para otorgar crédito o cargar a CxC, debes seleccionar un cliente registrado con RIF o Cédula.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shrink-0"
                      >
                        Seleccionar Cliente
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase">Titular de la Deuda / Cliente CxC:</span>
                        <h4 className="font-black text-sm text-blue-900 dark:text-blue-200">{selectedCliente.name}</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400">RIF/CI: {selectedCliente.taxId} {selectedCliente.phone ? `• Tlf: ${selectedCliente.phone}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-xs font-bold text-blue-700 underline"
                      >
                        Cambiar Cliente
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Plazo de Crédito:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[7, 15, 30].map(days => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => {
                              setCreditDays(days);
                              const d = new Date();
                              d.setDate(d.getDate() + days);
                              setCreditDueDate(d.toISOString().split('T')[0]);
                            }}
                            className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              creditDays === days
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {days} días
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Fecha de Vencimiento:
                      </label>
                      <input
                        type="date"
                        value={creditDueDate}
                        onChange={e => setCreditDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
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

            {/* Pie del Modal de Cobro */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing || (checkoutMode === 'contado' && saldoRestanteUsd > 0.01) || (checkoutMode === 'cxc' && selectedCliente.id === 'cli_final')}
                onClick={handleFinalizeSale}
                className={`px-6 py-2.5 text-sm font-black text-white rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  checkoutMode === 'cxc'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {isProcessing 
                    ? 'Procesando...' 
                    : checkoutMode === 'cxc' 
                    ? `Confirmar y Cargar a CxC ($${totalUsd.toFixed(2)})` 
                    : `Finalizar Cobro y Liberar Mesa ($${totalUsd.toFixed(2)})`
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERIR / MOVER MESA */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-emerald-600" />
                Transferir Comanda de {currentMesa.numero}
              </h4>
              <button onClick={() => setIsTransferModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecciona la mesa de destino a la cual se moverán los consumos actuales de la {currentMesa.numero}.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Mesa Destino:</label>
              <select
                value={transferTargetMesaId}
                onChange={e => setTransferTargetMesaId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              >
                {mesas
                  .filter(m => m.id !== activeMesaId)
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.numero} ({m.zona}) - {m.estado === 'libre' ? '🟢 Libre' : `🔵 Ocupada ($${(m.cart || []).reduce((s, i) => s + (i.cantidad * i.precioUnitario), 0).toFixed(2)})`}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTransferMesa}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Confirmar Transferencia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR NUEVA MESA */}
      {isAddMesaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Agregar Nueva Mesa o Ubicación
              </h4>
              <button onClick={() => setIsAddMesaModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre / N° de Mesa:</label>
                <input
                  type="text"
                  value={newMesaNumero}
                  onChange={e => setNewMesaNumero(e.target.value)}
                  placeholder="Ej. Mesa 9, Terraza VIP, Barra 5..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Zona / Área:</label>
                  <select
                    value={newMesaZona}
                    onChange={e => setNewMesaZona(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Salón">Salón</option>
                    <option value="Terraza">Terraza</option>
                    <option value="Barra">Barra</option>
                    <option value="VIP">VIP</option>
                    <option value="Para Llevar">Para Llevar</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Capacidad (Personas):</label>
                  <input
                    type="number"
                    min={1}
                    value={newMesaCapacidad}
                    onChange={e => setNewMesaCapacidad(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddMesaModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddNewMesa}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Guardar Mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELECTOR DE CLIENTE */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold">Seleccionar Cliente de la Mesa</h3>
              <button onClick={() => setIsClientModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={clientSearchTerm}
                onChange={e => setClientSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o RIF/Cédula..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => {
                  updateCurrentMesa(m => ({ ...m, cliente: { id: 'cli_final', name: 'Consumidor Final', taxId: 'V-00000000' } }));
                  setIsClientModalOpen(false);
                }}
                className="w-full text-left p-2.5 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-xs text-emerald-700 dark:text-emerald-400">Consumidor Final</div>
                  <div className="text-[10px] text-slate-400">V-00000000</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">Predeterminado</span>
              </button>

              {clientesFiltrados.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    updateCurrentMesa(m => ({ ...m, cliente: c }));
                    setIsClientModalOpen(false);
                  }}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                >
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.name}</div>
                  <div className="text-[10px] text-slate-400">RIF: {c.taxId || 'Sin RIF'} {c.phone ? `• Tlf: ${c.phone}` : ''}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lastSaleForPrint && (
        <PrintPreview
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={lastSaleForPrint.tipoDocumento === 'pre_cuenta' ? `Pre-Cuenta ${lastSaleForPrint.mesa}` : `Ticket #${lastSaleForPrint.numero}`}
          defaultPaperSize="letter"
          defaultOrientation="portrait"
          empresaData={empresa}
        >
          <PosTicketPrint factura={lastSaleForPrint} empresa={empresa} />
        </PrintPreview>
      )}
    </div>
  );
};

export default PosCashRegister;
