import React, { useState, useEffect } from 'react';
import { X, Plus, CheckCircle, Search, BookOpen, ChevronDown } from 'lucide-react';
import CuentaContableModal from './CuentaContableModal';
import { dbFetchCuentasContables } from '../../services/db';

interface VoucherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComprobante: any;
  cuentasContables: any[];
  onConfirm: (finalComprobante: any) => Promise<void> | void;
  title?: string;
  subtitle?: string;
  empresaId?: string;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  isOpen,
  onClose,
  initialComprobante,
  cuentasContables = [],
  onConfirm,
  title = 'Revisión de Comprobante Contable',
  subtitle = 'Verifique o asigne las cuentas contables correspondientes para contabilizar la operación.',
  empresaId
}) => {
  const [comprobante, setComprobante] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectingLineIndex, setSelectingLineIndex] = useState<number | null>(null);
  const [allCuentas, setAllCuentas] = useState<any[]>(cuentasContables);

  useEffect(() => {
    if (cuentasContables && cuentasContables.length > 0) {
      setAllCuentas(cuentasContables);
    } else {
      dbFetchCuentasContables(empresaId).then(data => {
        if (data && data.length > 0) {
          setAllCuentas(data);
        }
      });
    }
  }, [cuentasContables, empresaId]);

  useEffect(() => {
    if (initialComprobante) {
      const cloned = JSON.parse(JSON.stringify(initialComprobante));
      if (cloned.descripcion && Array.isArray(cloned.lineas)) {
        cloned.lineas = cloned.lineas.map((line: any) => ({
          ...line,
          descripcion: cloned.descripcion
        }));
      }
      setComprobante(cloned);
    }
  }, [initialComprobante]);

  if (!isOpen || !comprobante) return null;

  const handleMainDescriptionChange = (newDesc: string) => {
    setComprobante((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        descripcion: newDesc,
        lineas: (prev.lineas || []).map((line: any) => ({
          ...line,
          descripcion: newDesc
        }))
      };
    });
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updatedLineas = [...comprobante.lineas];
    updatedLineas[index] = { ...updatedLineas[index], [field]: value };

    const totalDebe = updatedLineas.reduce((acc, curr) => acc + (Number(curr.debe) || 0), 0);
    const totalHaber = updatedLineas.reduce((acc, curr) => acc + (Number(curr.haber) || 0), 0);
    const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

    setComprobante({
      ...comprobante,
      lineas: updatedLineas,
      total: Math.max(totalDebe, totalHaber),
      estado: isBalanced ? 'Contabilizado' : 'Descuadrado'
    });
  };

  const handleAddLine = () => {
    const newLine = {
      id: `l-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      cuentaId: '',
      descripcion: comprobante.descripcion || 'Línea de Comprobante',
      debe: 0,
      haber: 0
    };
    setComprobante({
      ...comprobante,
      lineas: [...comprobante.lineas, newLine]
    });
  };

  const handleRemoveLine = (index: number) => {
    const updatedLineas = comprobante.lineas.filter((_: any, i: number) => i !== index);
    const totalDebe = updatedLineas.reduce((acc: number, curr: any) => acc + (Number(curr.debe) || 0), 0);
    const totalHaber = updatedLineas.reduce((acc: number, curr: any) => acc + (Number(curr.haber) || 0), 0);
    const isBalanced = Math.abs(totalDebe - totalHaber) < 0.01;

    setComprobante({
      ...comprobante,
      lineas: updatedLineas,
      total: Math.max(totalDebe, totalHaber),
      estado: isBalanced ? 'Contabilizado' : 'Descuadrado'
    });
  };

  const totalDebe = (comprobante.lineas || []).reduce((acc: number, curr: any) => acc + (Number(curr.debe) || 0), 0);
  const totalHaber = (comprobante.lineas || []).reduce((acc: number, curr: any) => acc + (Number(curr.haber) || 0), 0);
  const diff = totalDebe - totalHaber;
  const isBalanced = Math.abs(diff) < 0.01;

  const activeCuentas = cuentasContables
    .filter(c => c.tipo === 'Movimiento')
    .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));

  const formatES = (num: number | string) => {
    const n = Number(num);
    if (isNaN(n) || num === undefined || num === null) return '0,00';
    let parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
  };

  const handleConfirmClick = async () => {
    if (!isBalanced || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(comprobante);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-indigo-800 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                Previsualización de Asiento
              </span>
              {!isBalanced && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  Descuadrado
                </span>
              )}
            </div>
            <h3 className="text-xl font-black mt-1">{title}</h3>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">{subtitle}</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido del Asiento */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/65 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">N° de Comprobante</label>
              <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{comprobante.numero}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">Fecha de Registro</label>
              <input
                type="date"
                className="w-full px-2 py-1 mt-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm font-bold text-slate-700 dark:text-slate-100 outline-none"
                value={comprobante.fecha}
                onChange={e => setComprobante({ ...comprobante, fecha: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">Referencia / Factura</label>
              <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200 mt-1">{comprobante.referencia}</p>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">Estado Comprobante</label>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 shadow-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'}`}>
                <span className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-red-500 animate-ping'}`} />
                {isBalanced ? 'Cuadrado / Listo' : 'Descuadrado'}
              </span>
            </div>
            <div className="col-span-1 md:col-span-4 border-t border-slate-100 dark:border-slate-700 pt-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-wider">Descripción Principal</label>
              <input
                type="text"
                className="w-full px-3 py-1.5 mt-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500"
                value={comprobante.descripcion}
                onChange={e => handleMainDescriptionChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detalle del Asiento (Partida Doble)</span>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-lg border border-teal-200 dark:border-teal-800 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} />
                Agregar Línea
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4 w-2/5">Cuenta Contable</th>
                    <th className="py-3 px-4 w-2/5">Descripción de Línea</th>
                    <th className="py-3 px-4 text-right w-24">Debe ($)</th>
                    <th className="py-3 px-4 text-right w-24">Haber ($)</th>
                    <th className="py-3 px-4 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {comprobante.lineas.map((line: any, index: number) => {
                    const cleanId = String(line.cuentaId || '').trim();
                    const normId = cleanId.replace(/\./g, '');
                    const cuenta = allCuentas.find(c => 
                      String(c.id).trim().toLowerCase() === cleanId.toLowerCase() || 
                      String(c.codigo).trim().toLowerCase() === cleanId.toLowerCase() ||
                      (normId && String(c.codigo || '').replace(/\./g, '') === normId)
                    );

                    return (
                      <tr key={line.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40 transition-colors font-medium">
                        <td className="p-2">
                          <div
                            onClick={() => setSelectingLineIndex(index)}
                            className={`w-full p-2 border rounded-lg text-xs cursor-pointer flex items-center justify-between group transition-all ${
                              cuenta
                                ? 'border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-950/30 hover:border-teal-500'
                                : 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-500'
                            }`}
                            title="Haga clic para abrir el catálogo de cuentas contables NIIF"
                          >
                            {cuenta ? (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono font-black text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded text-[11px] shrink-0 border border-teal-300 dark:border-teal-700">
                                  {cuenta.codigo}
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {cuenta.nombre}
                                </span>
                              </div>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5 truncate">
                                <BookOpen size={14} className="text-amber-600 shrink-0" />
                                {line.cuentaId ? `Cuenta: ${line.cuentaId} (clic para buscar)` : 'Seleccionar cuenta contable...'}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-teal-600 shrink-0 ml-1">
                              <Search size={13} />
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            className="w-full p-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:border-teal-500 outline-none"
                            value={line.descripcion}
                            onChange={e => handleLineChange(index, 'descripcion', e.target.value)}
                          />
                        </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 p-2 text-right border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:border-teal-500 outline-none"
                          value={line.debe || ''}
                          onChange={e => handleLineChange(index, 'debe', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 p-2 text-right border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:border-teal-500 outline-none"
                          value={line.haber || ''}
                          onChange={e => handleLineChange(index, 'haber', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center text-slate-400">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100/60 transition-colors"
                          title="Eliminar línea"
                          disabled={comprobante.lineas.length <= 1}
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="bg-slate-50 dark:bg-slate-700/60 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 text-xs font-semibold">
                  <span>Diferencia: 
                    <span className={`ml-1.5 font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      $ {formatES(diff)}
                    </span>
                  </span>
                  <span>Líneas: <span className="text-slate-800 dark:text-white font-bold">{comprobante.lineas.length}</span></span>
                </div>
                <div className="flex gap-6 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-black">Total Debe</p>
                    <p className="text-base text-teal-700 dark:text-teal-400 font-black">$ {formatES(totalDebe)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-black">Total Haber</p>
                    <p className="text-base text-indigo-700 dark:text-indigo-400 font-black">$ {formatES(totalHaber)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/70 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!isBalanced || isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-sm font-black text-white shadow-sm flex items-center gap-2 transition-colors ${
              isBalanced && !isSubmitting 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
            }`}
          >
            <CheckCircle size={16} />
            {isSubmitting ? 'Contabilizando...' : 'Confirmar y Contabilizar Asiento'}
          </button>
        </div>
      </div>

      {/* Modal Selector de Cuenta Contable NIIF */}
      {selectingLineIndex !== null && (
        <CuentaContableModal
          isOpen={selectingLineIndex !== null}
          onClose={() => setSelectingLineIndex(null)}
          cuentasContables={allCuentas}
          selectedCuentaId={comprobante.lineas[selectingLineIndex]?.cuentaId}
          onSelect={(selectedCuenta) => {
            handleLineChange(selectingLineIndex, 'cuentaId', selectedCuenta.id);
            setSelectingLineIndex(null);
          }}
          title="Catálogo de Cuentas NIIF"
          subtitle={`Seleccione la cuenta contable para la línea: "${comprobante.lineas[selectingLineIndex]?.descripcion || ''}"`}
          tipoFilter="Movimiento"
        />
      )}
    </div>
  );
};

export default VoucherPreviewModal;
