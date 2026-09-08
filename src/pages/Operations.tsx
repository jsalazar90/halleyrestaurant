import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit2, Trash2, Save, X, ChevronDown, 
  DollarSign, Tag, Calculator, Percent, Layers, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { dbSaveServicio, dbDeleteServicio } from '../services/db';
import BackButton from '../components/common/BackButton';

interface OperationsProps {
  servicios: any[];
  cuentasContables?: any[];
  onSave?: (collection: string, data: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Operations({ 
  servicios = [], 
  cuentasContables = [], 
  onSave, 
  showToast 
}: OperationsProps) {
  const { activeCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<any>(null);

  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [searchCuentaTerm, setSearchCuentaTerm] = useState('');

  // Cuentas de movimiento para ingresos
  const cuentasMovimiento = useMemo(() => {
    return cuentasContables
      .filter(c => c.tipo === 'Movimiento')
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
  }, [cuentasContables]);

  // Filtrado de servicios
  const filteredServicios = useMemo(() => {
    return servicios.filter(s => 
      (s.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [servicios, searchTerm]);

  // Métricas
  const metrics = useMemo(() => {
    const total = servicios.length;
    const exentos = servicios.filter(s => s.tipoIva === 'E' || s.exentoIva).length;
    const gravados = servicios.filter(s => s.tipoIva === 'G' || (!s.tipoIva && !s.exentoIva)).length;
    const avgPrice = total > 0 
      ? servicios.reduce((acc, s) => acc + (Number(s.precioBase) || 0), 0) / total 
      : 0;

    return { total, exentos, gravados, avgPrice };
  }, [servicios]);

  const handleEdit = (servicio: any) => {
    setCurrentService({
      id: servicio.id,
      codigo: servicio.codigo || '',
      nombre: servicio.nombre || '',
      descripcion: servicio.descripcion || '',
      precioBase: Number(servicio.precioBase) || 0,
      tipoIva: servicio.tipoIva || (servicio.exentoIva ? 'E' : 'G'),
      cuentaContableId: servicio.cuentaContableId || '',
      commissionPercentage: Number(servicio.commissionPercentage) || 0
    });
    setIsEditing(true);
  };

  const handleNew = () => {
    const nextCodeNumber = String(servicios.length + 1).padStart(3, '0');
    setCurrentService({
      id: `srv_${Date.now()}`,
      codigo: `SRV-${nextCodeNumber}`,
      nombre: '',
      descripcion: '',
      precioBase: 0,
      tipoIva: 'G',
      cuentaContableId: '',
      commissionPercentage: 0
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el servicio "${nombre}"?`)) return;
    try {
      if (onSave) {
        onSave('servicios', { id, _delete: true });
      } else {
        await dbDeleteServicio(id, activeCompanyId || 'default');
      }
      if (showToast) showToast('Servicio eliminado exitosamente', 'success');
    } catch {
      if (showToast) showToast('No se pudo eliminar el servicio', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentService.codigo || !currentService.nombre || Number(currentService.precioBase) < 0) {
      if (showToast) showToast('Por favor complete los campos obligatorios correctamente', 'error');
      return;
    }

    try {
      if (onSave) {
        onSave('servicios', currentService);
      } else {
        await dbSaveServicio(currentService, activeCompanyId || 'default');
      }
      if (showToast) showToast('Servicio guardado exitosamente', 'success');
      setIsEditing(false);
      setCurrentService(null);
    } catch {
      if (showToast) showToast('Error al guardar el servicio', 'error');
    }
  };

  const formatMoney = (amount: number) => {
    return `$ ${Number(amount || 0).toFixed(2)}`;
  };

  const selectedCuenta = cuentasContables.find(c => c.id === currentService?.cuentaContableId || c.codigo === currentService?.cuentaContableId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300 space-y-5">
      {/* Botón Volver y Badge Superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <BackButton to="/" label="Volver al Inicio" />
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
          Catálogo NIIF • Operaciones y Servicios
        </span>
      </div>

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              Operaciones & Catálogo de Servicios
              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2.5 py-0.5 rounded-full">
                {metrics.total} servicios
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Catálogo de servicios prestados por la empresa, tarifas base y cuentas contables NIIF
            </p>
          </div>
        </div>

        <button 
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/25 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Servicio</span>
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Servicios</span>
            <Layers size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {metrics.total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Disponibles para facturar</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tarifa Promedio</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatMoney(metrics.avgPrice)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Precio base en USD</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gravados con IVA (16%)</span>
            <Tag size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {metrics.gravados}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Alícuota general</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Exentos de IVA</span>
            <CheckCircle2 size={16} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.exentos}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">0% de impuesto</div>
        </div>
      </div>

      {/* Tabla del Catálogo */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar servicio por código, nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 shadow-2xs"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredServicios.length} de {servicios.length} servicios
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 dark:bg-slate-800/80 select-none">
                <th className="px-5 py-3.5 w-28">Código</th>
                <th className="px-5 py-3.5">Nombre del Servicio</th>
                <th className="px-5 py-3.5">Descripción</th>
                <th className="px-5 py-3.5 text-right w-32">Precio Base</th>
                <th className="px-5 py-3.5 text-center w-36">Tipo IVA</th>
                <th className="px-5 py-3.5">Cuenta Contable</th>
                <th className="px-5 py-3.5 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredServicios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No hay servicios registrados con ese criterio</p>
                    <p className="text-xs text-slate-400 mt-0.5">Haz clic en "Nuevo Servicio" para agregar uno.</p>
                  </td>
                </tr>
              ) : (
                filteredServicios.map((servicio) => {
                  const cuenta = cuentasContables.find(c => c.id === servicio.cuentaContableId || c.codigo === servicio.cuentaContableId);

                  return (
                    <tr key={servicio.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {servicio.codigo || 'SRV-000'}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        {servicio.nombre}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {servicio.descripcion || 'Sin descripción'}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                        {formatMoney(servicio.precioBase)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          servicio.tipoIva === 'G' || (!servicio.tipoIva && !servicio.exentoIva) 
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' 
                            : servicio.tipoIva === 'E' || servicio.exentoIva
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {servicio.tipoIva === 'E' || servicio.exentoIva ? 'Exento (0%)' :
                           servicio.tipoIva === 'R' ? 'Reducida (8%)' :
                           servicio.tipoIva === 'A' ? 'Adicional (31%)' : 'General (16%)'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {cuenta ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                              {cuenta.codigo}
                            </span>
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={cuenta.nombre}>
                              {cuenta.nombre}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No asignada</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleEdit(servicio)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
                            title="Editar Servicio"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(servicio.id, servicio.nombre)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors"
                            title="Eliminar Servicio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal para Crear / Editar Servicio */}
      {isEditing && currentService && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  {currentService.id.startsWith('srv_') ? 'Nuevo Servicio' : 'Editar Servicio'}
                </h3>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Código *</label>
                  <input 
                    type="text" 
                    value={currentService.codigo}
                    onChange={(e) => setCurrentService({...currentService, codigo: e.target.value})}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="SRV-001"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nombre del Servicio *</label>
                  <input 
                    type="text" 
                    value={currentService.nombre}
                    onChange={(e) => setCurrentService({...currentService, nombre: e.target.value})}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ej: Asesoría Contable / Transporte Ejecutivo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea 
                  value={currentService.descripcion}
                  onChange={(e) => setCurrentService({...currentService, descripcion: e.target.value})}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                  placeholder="Detalle de lo que incluye el servicio..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Precio Base (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={currentService.precioBase}
                      onChange={(e) => setCurrentService({...currentService, precioBase: Number(e.target.value)})}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tipo de IVA *</label>
                  <select 
                    value={currentService.tipoIva}
                    onChange={(e) => setCurrentService({...currentService, tipoIva: e.target.value, exentoIva: e.target.value === 'E'})}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
                  >
                    <option value="G">General (16%)</option>
                    <option value="E">Exento (0%)</option>
                    <option value="R">Reducida (8%)</option>
                    <option value="A">Adicional (31%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Comisión Base (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      max="100"
                      step="0.1"
                      value={currentService.commissionPercentage || 0}
                      onChange={(e) => setCurrentService({...currentService, commissionPercentage: Number(e.target.value)})}
                      className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Cuenta Contable NIIF (Ingreso)
                </label>
                <div 
                  onClick={() => setShowCuentaModal(true)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all flex justify-between items-center group"
                >
                  {selectedCuenta ? (
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 mr-2">
                        {selectedCuenta.codigo}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {selectedCuenta.nombre}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Seleccionar cuenta contable de ingreso...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-xs font-bold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <Save className="w-4 h-4" />
                Guardar Servicio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Selector de Cuenta Contable */}
      {showCuentaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white">Seleccionar Cuenta Contable NIIF</h3>
              <button onClick={() => setShowCuentaModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-hidden h-[450px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por código o nombre..." 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800"
                  value={searchCuentaTerm}
                  onChange={e => setSearchCuentaTerm(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 p-2 space-y-1">
                {cuentasMovimiento.filter(c => 
                  (c.codigo || '').toLowerCase().includes(searchCuentaTerm.toLowerCase()) || 
                  (c.nombre || '').toLowerCase().includes(searchCuentaTerm.toLowerCase())
                ).map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setCurrentService({...currentService, cuentaContableId: c.id});
                      setShowCuentaModal(false);
                    }}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-indigo-400 hover:shadow-xs cursor-pointer transition-all flex justify-between items-center group"
                  >
                    <div>
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 mr-2">
                        {c.codigo}
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                        {c.nombre}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {c.naturaleza}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
