import React, { useState, useMemo } from 'react';
import {
  Plus,
  X,
  Trash2,
  Edit3,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Hash,
  DollarSign,
  XCircle,
} from 'lucide-react';

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n);

const hasVal = (v) => v !== '' && v !== undefined && v !== null;

const borderClass = (v) =>
  hasVal(v) ? 'border-slate-300' : 'border-slate-200';

const floatClass = (v) =>
  hasVal(v)
    ? '-translate-y-2 text-[10px] text-slate-400 top-1'
    : 'top-3 text-sm text-slate-400';

// ── Helpers ──

function computeAmount(item) {
  if (item.is_excluded) return 0;
  const q = item.show_quantity ? parseFloat(item.quantity) || 0 : 1;
  const p = item.show_price ? parseFloat(item.unit_price) || 0 : 0;
  return q * p;
}

function blankItem() {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: null,
    unit_price: null,
    is_excluded: false,
    show_quantity: true,
    show_price: true,
  };
}

// ── Component ──

export default function BudgetItemEditor({ items, onItemsChange, isManualMode }) {
  // Bottom sheet state (mobile)
  const [showSheet, setShowSheet] = useState(false);
  const [sheetItem, setSheetItem] = useState(blankItem());
  const [editingId, setEditingId] = useState(null);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const setItems = (newItems) => onItemsChange(newItems);

  // ── Desktop helpers ──

  const addInlineItem = () => {
    setItems([...items, blankItem()]);
  };

  const updateItem = (id, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const toggleField = (id, field) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const newVal = !item[field];
        return {
          ...item,
          [field]: newVal,
          // Clear values when toggling off
          quantity: field === 'show_quantity' && !newVal ? null : item.quantity,
          unit_price: field === 'show_price' && !newVal ? null : item.unit_price,
        };
      })
    );
  };

  const removeItem = (id) => {
    if (items.length > 1 || deleteConfirmId === id) {
      setItems(items.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    }
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setItems(reordered);
  };

  // ── Mobile: Bottom sheet ──

  const openNewSheet = () => {
    setSheetItem(blankItem());
    setEditingId(null);
    setShowSheet(true);
  };

  const openEditSheet = (item) => {
    setSheetItem({ ...item });
    setEditingId(item.id);
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
    setEditingId(null);
  };

  const updateSheetField = (field, value) => {
    setSheetItem((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSheetField = (field) => {
    setSheetItem((prev) => {
      const newVal = !prev[field];
      return {
        ...prev,
        [field]: newVal,
        quantity: field === 'show_quantity' && !newVal ? null : prev.quantity,
        unit_price: field === 'show_price' && !newVal ? null : prev.unit_price,
      };
    });
  };

  const sheetSubtotal = useMemo(() => {
    return computeAmount(sheetItem);
  }, [sheetItem]);

  const canSaveSheet =
    sheetItem.description.trim() !== '';

  const saveSheetItem = () => {
    if (!canSaveSheet) return;
    const amount = computeAmount(sheetItem);

    const entry = {
      id: editingId || crypto.randomUUID(),
      description: sheetItem.description,
      quantity: sheetItem.show_quantity
        ? parseFloat(sheetItem.quantity) || null
        : null,
      unit_price: sheetItem.show_price
        ? parseFloat(sheetItem.unit_price) || null
        : null,
      is_excluded: sheetItem.is_excluded,
      show_quantity: sheetItem.show_quantity,
      show_price: sheetItem.show_price,
    };

    if (editingId) {
      setItems(items.map((item) => (item.id === editingId ? entry : item)));
    } else {
      setItems([...items, entry]);
    }
    closeSheet();
  };

  // ── Shared: Delete ──

  const requestDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id) => {
    setItems(items.filter((item) => item.id !== id));
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // ── Toggle button component ──

  const ToggleBtn = ({ active, onClick, icon: Icon, activeColor, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? `${activeColor} shadow-sm`
          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════
          MOBILE: Card list + Bottom sheet
      ═══════════════════════════════════════════ */}
      <div className="block md:hidden mb-4" data-tour="budget-form-items">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            Detalle de Servicios / Productos
            {items.length > 0 && (
              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">
                {items.length} Renglones
              </span>
            )}
          </h3>
        </div>

        {items.length === 0 && (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 px-6 text-center mb-4">
            <p className="text-sm text-slate-400 mb-1">No hay renglones todavía</p>
            <p className="text-xs text-slate-300">Agregá servicios o productos al presupuesto</p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-white border rounded-xl p-4 transition-all duration-200 ${
                item.is_excluded
                  ? 'border-red-200 bg-red-50/30'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-sm leading-tight truncate">
                      {item.description}
                      {item.is_excluded && (
                        <span className="ml-2 text-[10px] text-red-500 font-semibold uppercase tracking-wide">
                          No incluido
                        </span>
                      )}
                    </span>
                    {!isManualMode && !item.is_excluded && (
                      <span className="font-bold text-slate-800 text-sm whitespace-nowrap ml-2">
                        {ARS(computeAmount(item))}
                      </span>
                    )}
                  </div>
                  {!item.is_excluded && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      {item.show_quantity && item.quantity && (
                        <span>{item.quantity} ×</span>
                      )}
                      {item.show_price && item.unit_price && (
                        <span>{ARS(item.unit_price)}</span>
                      )}
                      {!item.show_price && !item.show_quantity && (
                        <span className="italic">Solo descripción</span>
                      )}
                    </div>
                  )}
                  {/* Mobile: Toggle badges */}
                  <div className="flex items-center gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => toggleField(item.id, 'show_quantity')}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${
                        item.show_quantity
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      # Cant.
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleField(item.id, 'show_price')}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${
                        item.show_price
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      $ Precio
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(item.id, 'is_excluded', !item.is_excluded)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${
                        item.is_excluded
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      🚫 No incl.
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {deleteConfirmId === item.id ? (
                    <div className="flex items-center gap-1 animate-in fade-in duration-150">
                      <button type="button" onClick={() => confirmDelete(item.id)} className="px-2.5 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">Eliminar</button>
                      <button type="button" onClick={cancelDelete} className="px-2.5 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => openEditSheet(item)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar"><Edit3 size={16} /></button>
                      <button type="button" onClick={() => requestDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={openNewSheet}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-600 hover:text-blue-700 font-semibold text-sm rounded-xl transition-all hover:bg-blue-50/50"
        >
          <Plus size={18} />
          Agregar ítem
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP: Table layout
      ═══════════════════════════════════════════ */}
      <div className="hidden md:block mb-4" data-tour="budget-form-items-desktop">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            Detalle de Servicios / Productos
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {items.length} Renglones
            </span>
          </h3>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Descripción</th>
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase w-16 text-center">Cant.</th>
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase w-24 text-right">P. Unitario</th>
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase w-24 text-right">Subtotal</th>
                <th className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase w-14 text-center">#</th>
                <th className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase w-14 text-center">$</th>
                <th className="px-2 py-2 text-[10px] font-bold text-slate-400 uppercase w-14 text-center">🚫</th>
                <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase w-20 text-center">Orden</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    No hay renglones. Agregá el primero.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`group hover:bg-slate-50/50 transition-colors ${
                      item.is_excluded ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Ej: Consultoría web..."
                        className="w-full px-3 py-1.5 text-sm bg-transparent border border-transparent focus:border-primary-200 rounded-md outline-none transition-all"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, 'description', e.target.value)
                        }
                      />
                    </td>
                    <>
                        <td className="px-4 py-2 text-center">
                          {item.show_quantity ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="—"
                              className="w-full px-2 py-1.5 text-sm bg-transparent border border-transparent focus:border-primary-200 rounded-md outline-none transition-all text-center"
                              value={item.quantity ?? ''}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  'quantity',
                                  e.target.value === '' ? null : e.target.value
                                )
                              }
                            />
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {item.show_price ? (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="$0.00"
                              className="w-full px-3 py-1.5 text-sm bg-transparent border border-transparent focus:border-primary-200 rounded-md outline-none transition-all text-right"
                              value={item.unit_price ?? ''}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  'unit_price',
                                  e.target.value === '' ? null : e.target.value
                                )
                              }
                            />
                          ) : (
                            <span className="text-slate-300 text-xs text-right block">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              item.is_excluded
                                ? 'text-red-300'
                                : computeAmount(item) > 0
                                ? 'text-slate-800'
                                : 'text-slate-300'
                            }`}
                          >
                            {item.is_excluded
                              ? '—'
                              : ARS(computeAmount(item))}
                          </span>
                        </td>
                    </>
                    <td className="px-2 py-2 text-center">
                      <ToggleBtn
                        active={item.show_quantity}
                        onClick={() => toggleField(item.id, 'show_quantity')}
                        icon={Hash}
                        activeColor="bg-blue-100 text-blue-700"
                        title="Mostrar / ocultar cantidad"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleBtn
                        active={item.show_price}
                        onClick={() => toggleField(item.id, 'show_price')}
                        icon={DollarSign}
                        activeColor="bg-green-100 text-green-700"
                        title="Mostrar / ocultar precio"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleBtn
                        active={item.is_excluded}
                        onClick={() =>
                          updateItem(item.id, 'is_excluded', !item.is_excluded)
                        }
                        icon={XCircle}
                        activeColor="bg-red-100 text-red-700"
                        title="No incluido en el presupuesto"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-1 justify-end animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => confirmDelete(item.id)}
                            className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-md hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            onClick={cancelDelete}
                            className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md hover:bg-slate-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => requestDelete(item.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={addInlineItem}
          className="mt-3 flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors py-2 px-3 rounded-lg border border-dashed border-primary-200 hover:border-primary-400"
        >
          <Plus size={14} />
          Agregar Renglón
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE: BOTTOM SHEET
      ═══════════════════════════════════════════ */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeSheet} />
          <div
            className="relative bg-white rounded-t-[20px] shadow-2xl w-full max-w-lg mx-auto"
            style={{ animation: 'slideUp 250ms ease-out' }}
          >
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>

            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 bg-slate-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 pt-2 pb-4">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar ítem' : 'Nuevo ítem'}
              </h3>
              <button type="button" onClick={closeSheet} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 pb-8 space-y-5">
              {/* Descripción */}
              <div className="relative">
                <input
                  type="text"
                  id="sheet-desc"
                  placeholder=" "
                  className={`peer w-full h-12 px-4 pt-4 pb-1 text-sm border rounded-xl outline-none transition-all focus:border-2 bg-transparent ${borderClass(sheetItem.description)}`}
                  value={sheetItem.description}
                  onChange={(e) => updateSheetField('description', e.target.value)}
                />
                <label htmlFor="sheet-desc" className={`absolute left-4 transition-all pointer-events-none ${floatClass(sheetItem.description)}`}>
                  Descripción
                </label>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSheetField('show_quantity')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    sheetItem.show_quantity
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Hash size={14} />
                  Cantidad
                </button>
                <button
                  type="button"
                  onClick={() => toggleSheetField('show_price')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    sheetItem.show_price
                      ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <DollarSign size={14} />
                  Precio
                </button>
              </div>

              {/* Quantity | Price */}
              <div className="grid grid-cols-2 gap-3">
                {sheetItem.show_quantity && (
                  <div className="relative">
                    <input
                      type="text"
                      id="sheet-qty"
                      inputMode="decimal"
                      placeholder=" "
                      className={`peer w-full h-12 px-4 pt-4 pb-1 text-sm border rounded-xl outline-none transition-all focus:border-2 bg-transparent ${borderClass(sheetItem.quantity)}`}
                      value={sheetItem.quantity ?? ''}
                      onChange={(e) =>
                        updateSheetField(
                          'quantity',
                          e.target.value === '' ? null : e.target.value
                        )
                      }
                    />
                    <label htmlFor="sheet-qty" className={`absolute left-4 transition-all pointer-events-none ${floatClass(sheetItem.quantity)}`}>
                      Cantidad
                    </label>
                  </div>
                )}
                {sheetItem.show_price && (
                  <div className="relative">
                    <input
                      type="text"
                      id="sheet-price"
                      inputMode="decimal"
                      placeholder=" "
                      className={`peer w-full h-12 px-4 pt-4 pb-1 text-sm border rounded-xl outline-none transition-all focus:border-2 bg-transparent ${borderClass(sheetItem.unit_price)}`}
                      value={sheetItem.unit_price ?? ''}
                      onChange={(e) =>
                        updateSheetField(
                          'unit_price',
                          e.target.value === '' ? null : e.target.value
                        )
                      }
                    />
                    <label htmlFor="sheet-price" className={`absolute left-4 transition-all pointer-events-none ${floatClass(sheetItem.unit_price)}`}>
                      Precio unit.
                    </label>
                  </div>
                )}
              </div>

              {/* Subtotal */}
              {(sheetItem.show_price || sheetItem.show_quantity) && (
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium text-slate-500">Subtotal</span>
                  <span className="text-base font-bold text-slate-800">
                    {sheetItem.is_excluded ? (
                      <span className="text-red-400 text-sm font-semibold">No incluido</span>
                    ) : (
                      ARS(sheetSubtotal)
                    )}
                  </span>
                </div>
              )}

              {/* No incluido checkbox */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    sheetItem.is_excluded
                      ? 'bg-red-500 border-red-500'
                      : 'border-slate-300 hover:border-red-400'
                  }`}
                  onClick={() => updateSheetField('is_excluded', !sheetItem.is_excluded)}
                >
                  {sheetItem.is_excluded && (
                    <X size={12} className="text-white" />
                  )}
                </div>
                <span className={`text-sm font-semibold ${sheetItem.is_excluded ? 'text-red-600' : 'text-slate-500'}`}>
                  No incluido en el presupuesto
                </span>
              </label>

              {/* Save */}
              <button
                type="button"
                onClick={saveSheetItem}
                disabled={!canSaveSheet}
                className="w-full h-[52px] flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-blue-500/25"
              >
                <CheckCircle2 size={18} />
                Guardar ítem
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
