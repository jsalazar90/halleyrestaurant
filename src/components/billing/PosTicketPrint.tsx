import React from 'react';

interface PosTicketPrintProps {
  factura: any;
  empresa: any;
}

export const PosTicketPrint: React.FC<PosTicketPrintProps> = ({ factura, empresa }) => {
  if (!factura) return null;

  const isPreCuenta = factura.tipoDocumento === 'pre_cuenta';
  const isCredito = factura.terminoPago === 'credito' || (factura.estado === 'Pendiente' && Number(factura.saldoPendiente || 0) > 0);
  const fechaFormateada = factura.fechaEmision || new Date().toISOString().split('T')[0];
  const tasa = Number(factura.tasaCambio) || 1.0;
  const totalUsd = Number(factura.total) || 0;
  const totalVes = totalUsd * tasa;
  const montoPagado = Number(factura.montoPagado) || totalUsd;
  const vuelto = Number(factura.vuelto) || 0;
  const pagosDetalle = Array.isArray(factura.pagosDetalle) ? factura.pagosDetalle : [];

  return (
    <div className="w-full max-w-[320px] mx-auto p-4 bg-white text-black font-mono text-xs leading-tight border border-gray-200 shadow-sm print:border-none print:shadow-none print:p-0">
      {/* Encabezado Empresa */}
      <div className="text-center pb-2 border-b border-dashed border-gray-400">
        <h2 className="text-sm font-bold uppercase tracking-wider">{empresa?.nombre || empresa?.name || 'SISTEMA RESTAURANTE'}</h2>
        <p className="font-semibold text-gray-700">RIF: {empresa?.rif || empresa?.taxId || 'J-00000000-0'}</p>
        {empresa?.direccion && <p className="text-[10px] text-gray-600 mt-0.5">{empresa.direccion}</p>}
        {empresa?.telefono && <p className="text-[10px] text-gray-600">Tlf: {empresa.telefono}</p>}

        {isPreCuenta && (
          <div className="mt-2 py-1 bg-amber-100 border border-amber-400 rounded text-amber-900 font-bold text-[11px] uppercase tracking-wider">
            *** PRE-CUENTA DE MESA ***
            <div className="text-[9px] font-normal lowercase">(no válido como factura legal)</div>
          </div>
        )}

        {isCredito && !isPreCuenta && (
          <div className="mt-2 py-1 bg-blue-100 border border-blue-400 rounded text-blue-900 font-bold text-[10px] uppercase tracking-wider">
            *** VENTA A CRÉDITO - CARGADO A CXC ***
          </div>
        )}
      </div>

      {/* Info Documento & Mesa */}
      <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
        <div className="flex justify-between font-bold">
          <span>{isPreCuenta ? 'PRE-CUENTA N°:' : (factura.tipoDocumento === 'factura' ? 'FACTURA:' : 'TICKET DE VENTA:')}</span>
          <span className="text-sm">{factura.numero}</span>
        </div>

        {/* Datos de Restaurante / Mesa */}
        {(factura.mesa || factura.mesaNumero) && (
          <div className="flex justify-between font-bold text-gray-900 py-0.5 border-y border-dotted border-gray-300">
            <span>MESA / UBICACIÓN:</span>
            <span className="text-sm bg-gray-100 px-1 rounded">{factura.mesa || factura.mesaNumero} {factura.zonaMesa ? `(${factura.zonaMesa})` : ''}</span>
          </div>
        )}

        {factura.mesero && (
          <div className="flex justify-between text-gray-700 text-[10px]">
            <span>Mesero / Atendido por:</span>
            <span className="font-semibold">{factura.mesero}</span>
          </div>
        )}

        {factura.personas && (
          <div className="flex justify-between text-gray-700 text-[10px]">
            <span>Comensales:</span>
            <span>{factura.personas} pers.</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <span>Fecha / Hora:</span>
          <span>{fechaFormateada}</span>
        </div>
        {!isPreCuenta && (
          <div className="flex justify-between text-gray-600">
            <span>Estado:</span>
            <span className="font-semibold uppercase">{factura.estado}</span>
          </div>
        )}
      </div>

      {/* Info Cliente */}
      <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
        <div className="font-bold text-gray-800">CLIENTE:</div>
        <div className="truncate font-semibold">{factura.clienteNombre || 'CONSUMIDOR FINAL'}</div>
        {factura.clienteRif && <div className="text-gray-600">CI/RIF: {factura.clienteRif}</div>}
        {factura.clienteTelefono && <div className="text-gray-600">Tlf: {factura.clienteTelefono}</div>}
      </div>

      {/* Detalle de Renglones de la Comanda */}
      <div className="py-2 border-b border-dashed border-gray-400">
        <div className="grid grid-cols-12 font-bold text-[10px] border-b border-gray-300 pb-1 mb-1">
          <span className="col-span-6">DESCRIPCIÓN / PLATO</span>
          <span className="col-span-2 text-center">CANT</span>
          <span className="col-span-4 text-right">TOTAL</span>
        </div>
        <div className="space-y-1.5">
          {(factura.detalles || []).map((item: any, idx: number) => {
            const cant = Number(item.cantidad) || 1;
            const precio = Number(item.precioUnitario || item.precio) || 0;
            const itemTotal = cant * precio;
            return (
              <div key={idx} className="grid grid-cols-12 text-[10px]">
                <div className="col-span-6">
                  <div className="font-semibold truncate">{item.nombre || item.descripcion}</div>
                  <div className="text-[9px] text-gray-500">
                    ${precio.toFixed(2)} {item.exento ? '(E)' : '(G)'}
                  </div>
                  {item.notas && <div className="text-[8px] text-gray-500 italic">* {item.notas}</div>}
                </div>
                <div className="col-span-2 text-center font-bold">{cant}</div>
                <div className="col-span-4 text-right font-semibold">${itemTotal.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totales */}
      <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${Number(factura.subtotal || 0).toFixed(2)}</span>
        </div>
        {Number(factura.montoExento || 0) > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Monto Exento:</span>
            <span>${Number(factura.montoExento).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>Base Imponible:</span>
          <span>${Number(factura.baseImponible || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>IVA ({Number(factura.ivaPorcentaje || 16)}%):</span>
          <span>${Number(factura.ivaMonto || 0).toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-base font-bold pt-1 border-t border-gray-300">
          <span>TOTAL USD:</span>
          <span>${totalUsd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-800 text-[11px]">
          <span>TOTAL VES (Bs):</span>
          <span>Bs. {totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="text-[9px] text-gray-500 text-right">
          Tasa Oficial BCV: Bs. {tasa.toFixed(4)}
        </div>
      </div>

      {/* Detalle de Pagos / Venta a Crédito */}
      {!isPreCuenta && (
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          {isCredito ? (
            <div className="bg-gray-50 p-2 rounded border border-gray-300 space-y-1">
              <div className="flex justify-between font-bold text-red-700">
                <span>CONDICIÓN DE PAGO:</span>
                <span>CRÉDITO (CxC)</span>
              </div>
              <div className="flex justify-between">
                <span>Vencimiento:</span>
                <span className="font-semibold">{factura.fechaVencimiento || factura.fechaEmision}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Saldo Pendiente:</span>
                <span>${Number(factura.saldoPendiente || totalUsd).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="font-bold text-gray-800 uppercase tracking-wider text-[9px] mb-1">
                FORMA DE PAGO:
              </div>
              {pagosDetalle.length > 0 ? (
                <div className="space-y-1">
                  {pagosDetalle.map((p: any, pIdx: number) => (
                    <div key={pIdx} className="flex justify-between">
                      <span className="capitalize">{p.metodoNombre || p.metodo}:</span>
                      <span className="font-semibold">
                        ${Number(p.montoUsd || 0).toFixed(2)}
                        {p.montoVes ? ` (Bs. ${Number(p.montoVes).toLocaleString('es-VE', { minimumFractionDigits: 2 })})` : ''}
                        {p.referencia ? ` [Ref: ${p.referencia}]` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between">
                  <span>Método:</span>
                  <span className="font-semibold uppercase">{factura.metodoPago || 'Efectivo'}</span>
                </div>
              )}

              <div className="flex justify-between pt-1 border-t border-dotted border-gray-300">
                <span>Monto Recibido:</span>
                <span>${montoPagado.toFixed(2)}</span>
              </div>
              {vuelto > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Cambio / Vuelto:</span>
                  <span>${vuelto.toFixed(2)} (Bs. {(vuelto * tasa).toFixed(2)})</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Pie de Ticket */}
      <div className="pt-3 text-center text-[10px] text-gray-600 space-y-1">
        {isPreCuenta ? (
          <p className="font-bold">Favor dirigirse a caja para cancelar su cuenta</p>
        ) : (
          <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
        )}
        <p className="text-[9px]">Comprobante emitido por Sistema Gastronómico</p>
      </div>
    </div>
  );
};

export default PosTicketPrint;
