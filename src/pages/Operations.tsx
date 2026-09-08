import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit2, Trash2, Save, X, ChevronDown, 
  DollarSign, Tag, Calculator, Percent, Layers, CheckCircle2, 
  ArrowRight, UtensilsCrossed, AlertTriangle, ArrowUpDown, 
  Download, Filter, Check, Eye, EyeOff, Sparkles, RefreshCw,
  Coffee, Wine, Pizza, Flame, Boxes, TrendingUp, Info, FileSpreadsheet
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { dbSaveServicio, dbDeleteServicio } from '../services/db';
import BackButton from '../components/common/BackButton';

export interface GastronomicItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  precioBase: number;
  precioVenta?: number;
  costo: number;
  margenPorcentaje?: number;
  manejaStock: boolean;
  stock: number;
  stockMinimo: number;
  unidadMedida: string; // 'Unidad' | 'Porción' | 'Kg' | 'Litro' | 'Botella' | 'Lata' | 'Caja'
  disponible: boolean;
  tipoIva: 'G' | 'E';
  exentoIva?: boolean;
  cuentaContableId?: string;
  commissionPercentage?: number;
  imagen?: string;
}

interface OperationsProps {
  servicios: any[];
  cuentasContables?: any[];
  bancos?: any[];
  configContable?: any;
  onSave?: (collection: string, data: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const CATEGORIAS_GASTRONOMICAS = [
  'Todas',
  'Entradas',
  'Platos Fuertes',
  'Hamburguesas & Sandwiches',
  'Pizzas',
  'Pastas',
  'Parrillas',
  'Guarniciones',
  'Bebidas',
  'Cervezas & Licores',
  'Postres',
  'Cafetería',
  'Insumos & Almacén'
];

const UNIDADES_MEDIDA = [
  'Unidad',
  'Porción',
  'Kg',
  'Gramo',
  'Litro',
  'Botella',
  'Lata',
  'Caja'
];

export default function Operations({ 
  servicios = [], 
  cuentasContables = [], 
  bancos = [],
  configContable = {},
  onSave, 
  showToast 
}: OperationsProps) {
  const { activeCompanyId } = useCompany();
  const cid = activeCompanyId || 'default';

  // Modo de visualización: 'menu' (Tarjetas gastronómicas) o 'inventario' (Tabla de stock)
  const [viewMode, setViewMode] = useState<'menu' | 'inventario'>('menu');

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [filterStockStatus, setFilterStockStatus] = useState<'todos' | 'bajo' | 'agotado' | 'disponible'>('todos');
  const [filterTipoItem, setFilterTipoItem] = useState<'todos' | 'cocina' | 'inventariables'>('todos');

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  // Modal Ajuste Rápido de Stock
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [itemForStockAdjust, setItemForStockAdjust] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<'entrada' | 'salida' | 'merma' | 'conteo'>('entrada');
  const [adjustQty, setAdjustQty] = useState<number | string>(1);
  const [adjustMotivo, setAdjustMotivo] = useState('');

  // Tasa de cambio BCV
  const tasaCambio = useMemo(() => {
    const t = Number(configContable?.tasa_bcv || configContable?.tasaCambio || 60);
    return t > 0 ? t : 60;
  }, [configContable]);

  // Cuentas de movimiento para ingresos
  const cuentasMovimiento = useMemo(() => {
    return cuentasContables
      .filter(c => c.tipo === 'Movimiento')
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [cuentasContables]);

  // Formatear items con propiedades gastronómicas garantizadas
  const itemsFormateados = useMemo(() => {
    return servicios.map(s => {
      const precio = Number(s.precioBase ?? s.precio_base ?? s.precio ?? s.precioVenta ?? 0);
      const costo = Number(s.costo ?? s.costoUnitario ?? (precio * 0.45)); // Estimado 45% si no se definió
      const manejaStock = s.manejaStock !== undefined ? Boolean(s.manejaStock) : (s.stock !== undefined && s.stock !== null);
      const stock = Number(s.stock || 0);
      const stockMinimo = Number(s.stockMinimo || 5);
      const disponible = s.disponible !== undefined ? Boolean(s.disponible) : true;
      const categoria = s.categoria || 'Platos Fuertes';
      const unidadMedida = s.unidadMedida || (manejaStock ? 'Unidad' : 'Porción');

      const ganancia = precio - costo;
      const margen = costo > 0 ? (ganancia / costo) * 100 : 100;

      return {
        ...s,
        id: s.id,
        codigo: s.codigo || `ITM-${s.id?.slice(-4) || '001'}`,
        nombre: s.nombre || s.name || 'Sin Nombre',
        descripcion: s.descripcion || '',
        categoria,
        precioBase: precio,
        costo,
        ganancia,
        margenPorcentaje: margen,
        manejaStock,
        stock,
        stockMinimo,
        unidadMedida,
        disponible,
        tipoIva: s.tipoIva || (s.exentoIva ? 'E' : 'G'),
        exentoIva: Boolean(s.exentoIva || s.tipoIva === 'E'),
        cuentaContableId: s.cuentaContableId || s.cuenta_contable_id || ''
      };
    });
  }, [servicios]);

  // Filtrado reactivo
  const filteredItems = useMemo(() => {
    return itemsFormateados.filter(item => {
      const matchesSearch = !searchTerm.trim() || 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'Todas' || item.categoria === selectedCategory;

      let matchesStock = true;
      if (filterStockStatus === 'bajo') {
        matchesStock = item.manejaStock && item.stock <= item.stockMinimo && item.stock > 0;
      } else if (filterStockStatus === 'agotado') {
        matchesStock = !item.disponible || (item.manejaStock && item.stock <= 0);
      } else if (filterStockStatus === 'disponible') {
        matchesStock = item.disponible && (!item.manejaStock || item.stock > 0);
      }

      let matchesTipo = true;
      if (filterTipoItem === 'cocina') {
        matchesTipo = !item.manejaStock;
      } else if (filterTipoItem === 'inventariables') {
        matchesTipo = item.manejaStock;
      }

      return matchesSearch && matchesCat && matchesStock && matchesTipo;
    });
  }, [itemsFormateados, searchTerm, selectedCategory, filterStockStatus, filterTipoItem]);

  // KPIs Analíticos
  const metrics = useMemo(() => {
    const total = itemsFormateados.length;
    let valorInventario = 0;
    let itemsStockBajo = 0;
    let itemsAgotados = 0;
    let sumaMargen = 0;

    itemsFormateados.forEach(item => {
      if (item.manejaStock) {
        valorInventario += (item.stock * item.costo);
        if (item.stock <= item.stockMinimo && item.stock > 0) itemsStockBajo++;
        if (item.stock <= 0) itemsAgotados++;
      }
      if (!item.disponible) itemsAgotados++;
      sumaMargen += (item.margenPorcentaje || 0);
    });

    const margenPromedio = total > 0 ? (sumaMargen / total) : 0;

    return {
      total,
      valorInventario,
      valorInventarioBs: valorInventario * tasaCambio,
      itemsStockBajo,
      itemsAgotados,
      margenPromedio
    };
  }, [itemsFormateados, tasaCambio]);

  // Crear nuevo plato/producto
  const handleNew = () => {
    const nextCode = `ITM-${String(itemsFormateados.length + 1).padStart(3, '0')}`;
    setCurrentItem({
      id: `srv_${Date.now()}`,
      codigo: nextCode,
      nombre: '',
      descripcion: '',
      categoria: selectedCategory !== 'Todas' ? selectedCategory : 'Platos Fuertes',
      precioBase: 0,
      costo: 0,
      manejaStock: false,
      stock: 0,
      stockMinimo: 5,
      unidadMedida: 'Porción',
      disponible: true,
      tipoIva: 'G',
      cuentaContableId: ''
    });
    setIsModalOpen(true);
  };

  // Editar plato/producto
  const handleEdit = (item: any) => {
    setCurrentItem({ ...item });
    setIsModalOpen(true);
  };

  // Alternar disponibilidad rápida (Disponible / Agotado)
  const handleToggleDisponible = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...item, disponible: !item.disponible };
    try {
      if (onSave) onSave('servicios', updated);
      else await dbSaveServicio(updated, cid);

      if (showToast) {
        showToast(
          updated.disponible ? `"${item.nombre}" marcado como Disponible` : `"${item.nombre}" marcado como Agotado`,
          'info'
        );
      }
    } catch {
      if (showToast) showToast('Error al actualizar disponibilidad', 'error');
    }
  };

  // Guardar creación / edición
  const handleSaveItem = async () => {
    if (!currentItem.codigo || !currentItem.nombre || Number(currentItem.precioBase) < 0) {
      if (showToast) showToast('Completa los campos obligatorios (código, nombre y precio)', 'error');
      return;
    }

    try {
      const payload = {
        ...currentItem,
        precioBase: Number(currentItem.precioBase) || 0,
        precio: Number(currentItem.precioBase) || 0,
        costo: Number(currentItem.costo) || 0,
        stock: currentItem.manejaStock ? Number(currentItem.stock || 0) : 0,
        stockMinimo: currentItem.manejaStock ? Number(currentItem.stockMinimo || 5) : 0,
        tipoIva: currentItem.tipoIva || 'G',
        exentoIva: currentItem.tipoIva === 'E'
      };

      if (onSave) {
        onSave('servicios', payload);
      } else {
        await dbSaveServicio(payload, cid);
      }

      if (showToast) showToast(`"${payload.nombre}" guardado con éxito`, 'success');
      setIsModalOpen(false);
      setCurrentItem(null);
    } catch {
      if (showToast) showToast('Error al guardar el ítem', 'error');
    }
  };

  // Eliminar
  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar definitivamente "${nombre}" del menú/inventario?`)) return;
    try {
      if (onSave) {
        onSave('servicios', { id, _delete: true });
      } else {
        await dbDeleteServicio(id, cid);
      }
      if (showToast) showToast(`"${nombre}" eliminado`, 'success');
    } catch {
      if (showToast) showToast('No se pudo eliminar el ítem', 'error');
    }
  };

  // Abrir Modal de Ajuste de Stock
  const handleOpenStockAdjust = (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setItemForStockAdjust(item);
    setAdjustType('entrada');
    setAdjustQty(1);
    setAdjustMotivo('');
    setIsStockModalOpen(true);
  };

  // Guardar Ajuste de Stock
  const handleSaveStockAdjust = async () => {
    if (!itemForStockAdjust) return;
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      if (showToast) showToast('Ingresa una cantidad válida mayor a cero', 'error');
      return;
    }

    let newStock = Number(itemForStockAdjust.stock || 0);
    if (adjustType === 'entrada') {
      newStock += qty;
    } else if (adjustType === 'salida' || adjustType === 'merma') {
      newStock = Math.max(0, newStock - qty);
    } else if (adjustType === 'conteo') {
      newStock = qty;
    }

    const updated = {
      ...itemForStockAdjust,
      manejaStock: true,
      stock: newStock,
      disponible: newStock > 0
    };

    try {
      if (onSave) onSave('servicios', updated);
      else await dbSaveServicio(updated, cid);

      if (showToast) {
        showToast(
          `Stock ajustado: ${itemForStockAdjust.nombre} ahora tiene ${newStock} ${itemForStockAdjust.unidadMedida}`,
          'success'
        );
      }
      setIsStockModalOpen(false);
      setItemForStockAdjust(null);
    } catch {
      if (showToast) showToast('Error al actualizar el stock', 'error');
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      if (showToast) showToast('No hay ítems para exportar', 'info');
      return;
    }

    const headers = [
      'Codigo', 'Nombre', 'Categoria', 'Descripcion',
      'Precio USD', 'Precio VES', 'Costo USD', 'Margen %',
      'Maneja Stock', 'Stock Actual', 'Stock Minimo', 'Unidad Medida',
      'Estado', 'Tipo IVA'
    ];

    const rows = filteredItems.map(it => [
      `"${it.codigo}"`,
      `"${it.nombre.replace(/"/g, '""')}"`,
      `"${it.categoria}"`,
      `"${(it.descripcion || '').replace(/"/g, '""')}"`,
      it.precioBase.toFixed(2),
      (it.precioBase * tasaCambio).toFixed(2),
      it.costo.toFixed(2),
      it.margenPorcentaje?.toFixed(1) || '0',
      it.manejaStock ? 'SI' : 'NO',
      it.manejaStock ? it.stock : 'N/A',
      it.manejaStock ? it.stockMinimo : 'N/A',
      `"${it.unidadMedida}"`,
      it.disponible ? 'Disponible' : 'Agotado',
      it.tipoIva === 'E' ? 'Exento' : 'Gravable 16%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `menu_inventario_restaurante_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300 space-y-4 sm:space-y-5 select-none">
      
      {/* 1. BARRA SUPERIOR CON NAVEGACIÓN Y BADGE */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <BackButton to="/" label="Volver al Inicio" />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-full border border-amber-500/30">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Módulo Gastronómico • Carta & Almacén
          </span>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            Tasa BCV: <strong className="text-emerald-600">{tasaCambio.toFixed(2)} Bs/$</strong>
          </span>
        </div>
      </div>

      {/* 2. HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Menú & Control de Inventario
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Administración de la carta de platos, costeo de recetas, márgenes y existencias de almacén
            </p>
          </div>
        </div>

        {/* ACCIONES DEL HEADER: SELECTOR DE VISTA & BOTÓN NUEVO */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Modo: Menú vs Inventario */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('menu')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'menu'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Carta / Menú</span>
            </button>
            <button
              onClick={() => setViewMode('inventario')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'inventario'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Inventario & Stock</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Exportar a CSV / Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={handleNew}
            className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 transition-all shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo Plato / Producto</span>
          </button>
        </div>
      </div>

      {/* 3. TARJETAS DE KPIS ANALÍTICOS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Ítems en Carta</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {metrics.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {itemsFormateados.filter(i => i.manejaStock).length} con control de stock
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Valor Inventario</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${metrics.valorInventario.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ~{metrics.valorInventarioBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Stock Crítico / Agotado</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.itemsStockBajo + metrics.itemsAgotados}
          </div>
          <div className="text-[10px] text-rose-500 font-bold mt-0.5">
            {metrics.itemsStockBajo} por reponer • {metrics.itemsAgotados} agotados
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Margen Promedio</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {metrics.margenPromedio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Markup sobre costo estimado
          </div>
        </div>
      </div>

      {/* 4. BARRA DE HERRAMIENTAS: BUSCADOR, CATEGORÍAS Y FILTROS */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por plato, ingrediente, código o categoría..."
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros de Tipo y Estado */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={filterTipoItem}
              onChange={e => setFilterTipoItem(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="cocina">🍳 Solo Platos de Cocina</option>
              <option value="inventariables">📦 Solo Inventariables</option>
            </select>

            <select
              value={filterStockStatus}
              onChange={e => setFilterStockStatus(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="todos">Cualquier Estado</option>
              <option value="disponible">🟢 Disponibles</option>
              <option value="bajo">⚠️ Stock Bajo</option>
              <option value="agotado">🔴 Agotados</option>
            </select>
          </div>
        </div>

        {/* Chips de Categorías Gastronómicas Deslizables */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS_GASTRONOMICAS.map(cat => {
            const count = cat === 'Todas' 
              ? itemsFormateados.length 
              : itemsFormateados.filter(i => i.categoria === cat).length;
            if (count === 0 && cat !== 'Todas') return null;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-black shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat ? 'bg-white/20 text-white dark:text-slate-950 font-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. VISTA 1: MENÚ / CARTA GASTRONÓMICA (Tarjetas Visuales) */}
      {viewMode === 'menu' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No hay platos que coincidan con la búsqueda</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Prueba cambiando los filtros de categoría o haz clic en "Nuevo Plato / Producto" para agregarlo a la carta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredItems.map(item => {
                const precio = item.precioBase;
                const costo = item.costo;
                const ganancia = item.ganancia;
                const margen = item.margenPorcentaje;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleEdit(item)}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-xs hover:shadow-md hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all flex flex-col justify-between group cursor-pointer relative"
                  >
                    {/* Top: Categoría & Toggle Disponibilidad */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-200 dark:border-amber-800/60">
                        {item.categoria}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleDisponible(item, e)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 transition-all ${
                          item.disponible
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-200'
                        }`}
                        title="Toca para cambiar disponibilidad en cocina"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.disponible ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{item.disponible ? 'Disponible' : 'Agotado'}</span>
                      </button>
                    </div>

                    {/* Nombre y Descripción */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-baseline justify-between gap-1">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {item.nombre}
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                          {item.codigo}
                        </span>
                      </div>
                      {item.descripcion && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Stock si maneja inventario */}
                    {item.manejaStock && (
                      <div className="mb-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Boxes className="w-3.5 h-3.5" /> Stock:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-black ${
                            item.stock <= 0 
                              ? 'text-rose-600' 
                              : item.stock <= item.stockMinimo 
                              ? 'text-amber-600' 
                              : 'text-emerald-600'
                          }`}>
                            {item.stock} {item.unidadMedida}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleOpenStockAdjust(item, e)}
                            className="p-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 hover:text-amber-600 shadow-2xs"
                            title="Ajustar stock"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rentabilidad y Precios */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>Costo: <strong className="text-slate-600 dark:text-slate-300 font-mono">${costo.toFixed(2)}</strong></span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          +{margen.toFixed(0)}% (${ganancia.toFixed(2)})
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-mono">
                            ${precio.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-bold">
                            ~{(precio * tasaCambio).toFixed(2)} Bs
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                            title="Editar plato"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id, item.nombre);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-600 hover:text-white transition-colors"
                            title="Eliminar plato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. VISTA 2: INVENTARIO & CONTROL DE STOCK (Tabla Analítica) */}
      {viewMode === 'inventario' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Plato / Producto</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5 text-center">Tipo</th>
                  <th className="p-3.5 text-right">Existencia</th>
                  <th className="p-3.5 text-right">Stock Mín.</th>
                  <th className="p-3.5 text-right">Costo Unit.</th>
                  <th className="p-3.5 text-right">Valor Total</th>
                  <th className="p-3.5 text-right">Precio Venta</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map(item => {
                  const isLow = item.manejaStock && item.stock <= item.stockMinimo && item.stock > 0;
                  const isOut = !item.disponible || (item.manejaStock && item.stock <= 0);
                  const valorTotal = item.manejaStock ? (item.stock * item.costo) : 0;

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-400">{item.codigo}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{item.nombre}</div>
                        {item.descripcion && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.descripcion}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.manejaStock 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}>
                          {item.manejaStock ? 'Almacén' : 'Cocina'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold">
                        {item.manejaStock ? (
                          <span className={`${
                            isOut ? 'text-rose-600 font-black' : isLow ? 'text-amber-600 font-black' : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.stock} {item.unidadMedida}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Receta</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-400">
                        {item.manejaStock ? `${item.stockMinimo} ${item.unidadMedida}` : '-'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-600 dark:text-slate-300">
                        ${item.costo.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ${valorTotal.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white">
                        ${item.precioBase.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleDisponible(item, e)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.disponible
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {item.disponible ? 'Disponible' : 'Agotado'}
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.manejaStock && (
                            <button
                              onClick={() => handleOpenStockAdjust(item)}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-amber-600"
                              title="Ajustar Stock"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-amber-600"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.nombre)}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREAR / EDITAR PLATO O PRODUCTO */}
      {/* ========================================================================= */}
      {isModalOpen && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {currentItem.id?.startsWith('srv_') && !servicios.some(s => s.id === currentItem.id)
                      ? 'Nuevo Plato / Producto'
                      : 'Editar Plato / Producto'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuración de carta, costeo, stock y contabilidad
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Código: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentItem.codigo || ''}
                    onChange={e => setCurrentItem({ ...currentItem, codigo: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nombre del Plato o Producto: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentItem.nombre || ''}
                    onChange={e => setCurrentItem({ ...currentItem, nombre: e.target.value })}
                    placeholder="Ej. Hamburguesa Doble Carne, Pizza Margarita..."
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Categoría y Disponibilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Categoría Gastronómica:
                  </label>
                  <select
                    value={currentItem.categoria || 'Platos Fuertes'}
                    onChange={e => setCurrentItem({ ...currentItem, categoria: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {CATEGORIAS_GASTRONOMICAS.filter(c => c !== 'Todas').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Disponibilidad en Cocina / Barra:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentItem({ ...currentItem, disponible: true })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        currentItem.disponible
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      🟢 Disponible
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentItem({ ...currentItem, disponible: false })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        !currentItem.disponible
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      🔴 Agotado
                    </button>
                  </div>
                </div>
              </div>

              {/* Descripción / Ingredientes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Descripción o Ingredientes:
                </label>
                <textarea
                  rows={2}
                  value={currentItem.descripcion || ''}
                  onChange={e => setCurrentItem({ ...currentItem, descripcion: e.target.value })}
                  placeholder="Detalles de la preparación, acompañamientos, alérgenos..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {/* Costo, Margen y Precio de Venta */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 space-y-3">
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Precios & Costeo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Costo Unitario ($ USD):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={currentItem.costo || ''}
                      onChange={e => {
                        const c = parseFloat(e.target.value) || 0;
                        setCurrentItem({ ...currentItem, costo: c });
                      }}
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Precio de Venta ($ USD): <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={currentItem.precioBase || ''}
                      onChange={e => {
                        const p = parseFloat(e.target.value) || 0;
                        setCurrentItem({ ...currentItem, precioBase: p });
                      }}
                      className="w-full px-3 py-2 text-sm font-mono font-black text-emerald-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Equivalente en Bolívares (BCV):
                    </label>
                    <div className="px-3 py-2 text-xs font-mono font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                      ~{((currentItem.precioBase || 0) * tasaCambio).toFixed(2)} Bs
                    </div>
                  </div>
                </div>

                {/* Ganancia y Margen Calculados */}
                <div className="text-[11px] font-bold text-slate-500 flex justify-between pt-1">
                  <span>
                    Ganancia Bruta: <strong className="text-emerald-600">${((currentItem.precioBase || 0) - (currentItem.costo || 0)).toFixed(2)}</strong>
                  </span>
                  <span>
                    Margen de Ganancia: <strong className="text-indigo-600">
                      {currentItem.costo > 0 ? ((((currentItem.precioBase || 0) - currentItem.costo) / currentItem.costo) * 100).toFixed(1) : 100}%
                    </strong>
                  </span>
                </div>
              </div>

              {/* Control de Inventario / Stock */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-blue-500" />
                      Control de Existencias (Stock)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Activa si es un producto terminado, bebida, licor o insumo que requiera control de almacén
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    id="chkManejaStock"
                    checked={Boolean(currentItem.manejaStock)}
                    onChange={e => setCurrentItem({ ...currentItem, manejaStock: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                </div>

                {currentItem.manejaStock && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Unidad de Medida:
                      </label>
                      <select
                        value={currentItem.unidadMedida || 'Unidad'}
                        onChange={e => setCurrentItem({ ...currentItem, unidadMedida: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        {UNIDADES_MEDIDA.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Stock Actual:
                      </label>
                      <input
                        type="number"
                        value={currentItem.stock ?? 0}
                        onChange={e => setCurrentItem({ ...currentItem, stock: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Stock Mínimo (Alerta):
                      </label>
                      <input
                        type="number"
                        value={currentItem.stockMinimo ?? 5}
                        onChange={e => setCurrentItem({ ...currentItem, stockMinimo: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Impuesto IVA & Contabilidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tratamiento de IVA:
                  </label>
                  <select
                    value={currentItem.tipoIva || 'G'}
                    onChange={e => setCurrentItem({ ...currentItem, tipoIva: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="G">Gravable General (16% IVA)</option>
                    <option value="E">Exento de IVA (0%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Cuenta Contable de Ingreso:
                  </label>
                  <select
                    value={currentItem.cuentaContableId || ''}
                    onChange={e => setCurrentItem({ ...currentItem, cuentaContableId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Cuenta de Ventas Predeterminada (4.1.01)</option>
                    {cuentasMovimiento
                      .filter(c => c.codigo?.startsWith('4.'))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} - {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveItem}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Ítem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AJUSTE RÁPIDO DE STOCK */}
      {/* ========================================================================= */}
      {isStockModalOpen && itemForStockAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-amber-500" />
                Ajustar Stock de Almacén
              </h4>
              <button onClick={() => setIsStockModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Producto:</span>
              <h5 className="font-black text-sm text-slate-900 dark:text-white">{itemForStockAdjust.nombre}</h5>
              <p className="text-xs text-slate-500 font-mono">
                Stock actual: <strong className="text-slate-800 dark:text-slate-200">{itemForStockAdjust.stock} {itemForStockAdjust.unidadMedida}</strong>
              </p>
            </div>

            {/* Tipo de Ajuste */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Tipo de Movimiento:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAdjustType('entrada')}
                  className={`py-1.5 px-2 rounded-xl border transition-all ${
                    adjustType === 'entrada'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📥 Entrada (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('salida')}
                  className={`py-1.5 px-2 rounded-xl border transition-all ${
                    adjustType === 'salida'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📤 Salida (-)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('merma')}
                  className={`py-1.5 px-2 rounded-xl border transition-all ${
                    adjustType === 'merma'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  🍳 Merma (-)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('conteo')}
                  className={`py-1.5 px-2 rounded-xl border transition-all ${
                    adjustType === 'conteo'
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  📋 Conteo Exacto
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                {adjustType === 'conteo' ? 'Cantidad Real Contada:' : 'Cantidad a Modificar:'}
              </label>
              <input
                type="number"
                step="any"
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
                className="w-full px-3 py-2 text-base font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Motivo u Observación (Opcional):
              </label>
              <input
                type="text"
                value={adjustMotivo}
                onChange={e => setAdjustMotivo(e.target.value)}
                placeholder="Ej. Factura compra #1234, Desperdicio en cocina..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjust}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
