import React from 'react';
import { ChevronDown, BookOpen, X } from 'lucide-react';

interface CuentaSelectorTriggerProps {
  label?: string;
  value?: string;
  cuentasContables: any[];
  onClick: () => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
}

export default function CuentaSelectorTrigger({
  label,
  value,
  cuentasContables = [],
  onClick,
  onClear,
  placeholder = "Seleccionar cuenta contable...",
  className = "",
  disabled = false,
  required = false,
  error = false
}: CuentaSelectorTriggerProps) {
  const selectedCuenta = cuentasContables.find(
    c => String(c.id) === String(value) || String(c.codigo) === String(value)
  );

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-700 block">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}
      <div 
        onClick={!disabled ? onClick : undefined}
        className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm transition-all flex justify-between items-center group ${
          error
            ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
            : 'border-slate-200'
        } ${
          disabled 
            ? 'opacity-60 cursor-not-allowed bg-slate-100' 
            : 'hover:bg-white hover:border-indigo-400 cursor-pointer'
        }`}
      >
        {selectedCuenta ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
              {selectedCuenta.codigo}
            </span>
            <span className="font-bold text-xs text-slate-800 truncate">
              {selectedCuenta.nombre}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 flex-1">
            <BookOpen size={13} className="text-slate-400" />
            {placeholder}
          </span>
        )}

        <div className="flex items-center shrink-0 ml-2">
          {value && onClear && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-slate-200/60 transition-colors mr-1 cursor-pointer"
              title="Quitar cuenta seleccionada"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 shrink-0" />
        </div>
      </div>
    </div>
  );
}
