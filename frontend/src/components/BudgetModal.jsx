import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle,
  Edit3,
  Search,
  User,
} from 'lucide-react';
import { clientService } from '../services/api';
import BudgetItemEditor from './BudgetItemEditor';

const COLORS = [
  { name: 'Azul', value: '#2563eb' },
  { name: 'Rojo', value: '#dc2626' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Amarillo', value: '#ca8a04' },
  { name: 'Naranja', value: '#ea580c' },
  { name: 'Violeta', value: '#9333ea' },
  { name: 'Negro', value: '#1e293b' },
];

const INPUT_CLS =
  'w-full min-h-[44px] px-3.5 rounded-xl border border-[#cce6f0] bg-white font-semibold text-slate-800 placeholder:font-normal placeholder:text-slate-400 outline-none transition-all focus:border-[#04b2d9] focus:ring-2 focus:ring-[#04b2d9]/30';
const LABEL_CLS = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

function Section({ step, title, children, ...rest }) {
  return (
    <section className="bg-white border border-[#cce6f0] rounded-2xl p-5" {...rest}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-6 h-6 rounded-full bg-[#025373] text-white text-xs font-extrabold flex items-center justify-center">
          {step}
        </span>
        <h3 className="text-base font-extrabold text-[#081b26]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

const ARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n);

// ── Helpers for item conversion ──

function computeAmount(item) {
  if (item.is_excluded) return 0;
  const q = item.show_quantity ? parseFloat(item.quantity) || 0 : 1;
  const p = item.show_price ? parseFloat(item.unit_price) || 0 : 0;
  return q * p;
}

function fromApiItem(apiItem) {
  const showPrice = apiItem.unit_price !== null || apiItem.amount > 0;
  const showQty = apiItem.quantity !== null;
  return {
    id: crypto.randomUUID(),
    description: apiItem.description || '',
    quantity: apiItem.quantity ?? null,
    unit_price: apiItem.unit_price ?? (showPrice && !showQty ? apiItem.amount : null),
    is_excluded: apiItem.is_excluded || false,
    show_quantity: showQty,
    show_price: showPrice,
  };
}

function toApiItem(item, index) {
  const amount = computeAmount(item);
  return {
    description: item.description,
    amount,
    quantity: item.show_quantity ? (parseFloat(item.quantity) || null) : null,
    unit_price: item.show_price ? (parseFloat(item.unit_price) || null) : null,
    is_excluded: item.is_excluded,
    order_index: index,
  };
}

export default function BudgetModal({ isOpen, onClose, onSubmit, initialData }) {
  const [client, setClient] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validity, setValidity] = useState('15 días');
  const [validityEnabled, setValidityEnabled] = useState(true);
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [status, setStatus] = useState('Pendiente');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTotal, setManualTotal] = useState(0);
  const [items, setItems] = useState([]);

  // Clients Logic
  const [clients, setClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClients();
      if (initialData) {
        setClient(initialData.client);
        setDate(new Date(initialData.date).toISOString().split('T')[0]);
        const v = initialData.validity;
        setValidity(v || '15 días');
        setValidityEnabled(v !== null && v !== undefined && v !== '');
        setAccentColor(initialData.accent_color || '#2563eb');
        setStatus(initialData.status);
        setIsManualMode(initialData.is_manual_total === 1);
        setManualTotal(initialData.total);

        if (initialData.items && initialData.items.length > 0) {
          setItems(initialData.items.map(fromApiItem));
        } else {
          setItems([]);
        }
      } else {
        setClient('');
        setDate(new Date().toISOString().split('T')[0]);
        setValidity('15 días');
        setValidityEnabled(true);
        setAccentColor('#2563eb');
        setStatus('Pendiente');
        setIsManualMode(false);
        setManualTotal(0);
        setItems([]);
      }
    }
  }, [isOpen, initialData]);

  const loadClients = async () => {
    try {
      const data = await clientService.getAll();
      setClients(data);
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(client.toLowerCase())
  );

  // Auto total — exclude excluded items, compute amount per item
  const autoTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + computeAmount(item), 0);
  }, [items]);

  const finalTotal = isManualMode ? manualTotal : autoTotal;

  // ── Submit ──

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client) return;

    const budgetData = {
      client,
      date: new Date(date).toISOString(),
      validity: validityEnabled ? validity : null,
      accent_color: accentColor,
      status: initialData ? status : undefined,
      is_manual_total: isManualMode ? 1 : 0,
      total: isManualMode ? parseFloat(manualTotal) : undefined,
      items: items.map((item, index) => toApiItem(item, index)),
    };

    onSubmit(budgetData);
  };

  if (!isOpen) return null;

  const includedCount = items.filter((i) => !i.is_excluded).length;
  const excludedCount = items.length - includedCount;
  const colorName = COLORS.find((c) => c.value === accentColor)?.name ?? 'Personalizado';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
      <div className="flex min-h-full items-stretch justify-center p-0 md:items-center md:p-6">
        <form
          onSubmit={handleSubmit}
          data-tour="budget-modal"
          className="bg-[#f5faff] w-full min-h-screen shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:min-h-0 md:max-w-6xl md:my-auto md:max-h-[calc(100dvh-3rem)] md:rounded-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#cce6f0] flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <Edit3 className="text-[#025373]" size={20} />
              <h2 className="text-lg font-extrabold text-[#081b26]">
                {initialData ? 'Editar presupuesto' : 'Nuevo presupuesto'}
              </h2>
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Cerrar"
              className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable content: steps + summary */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
              <div className="flex flex-col gap-5 min-w-0">
                {/* 1 · Cliente */}
                <Section step={1} title="Cliente" data-tour="budget-form-client">
                  <label htmlFor="budget-client" className={LABEL_CLS}>Buscar o crear cliente</label>
                  <div className="relative">
                    <input
                      id="budget-client"
                      required
                      type="text"
                      placeholder="Buscar o crear..."
                      className={`${INPUT_CLS} pr-10`}
                      value={client}
                      onChange={(e) => {
                        setClient(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      {showClientDropdown ? <Search size={16} /> : <User size={16} />}
                    </div>

                    {showClientDropdown && client.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cce6f0] rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((c) => (
                            <div
                              key={c.id}
                              className="px-4 py-2.5 hover:bg-[#e8f6fc] cursor-pointer text-sm text-slate-700 flex items-center gap-2"
                              onClick={() => {
                                setClient(c.name);
                                setShowClientDropdown(false);
                              }}
                            >
                              <div className="w-6 h-6 rounded-full bg-[#e8f6fc] flex items-center justify-center text-[10px] font-bold text-[#025373]">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              {c.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2.5 text-xs text-slate-500 italic">
                            Presiona enter para usar "{client}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Section>

                {/* 2 · Detalles */}
                <Section step={2} title="Detalles del documento">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="budget-date" className={LABEL_CLS}>Fecha</label>
                      <input
                        id="budget-date"
                        type="date"
                        className={INPUT_CLS}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="budget-validity" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Validez</label>
                        <button
                          type="button"
                          onClick={() => setValidityEnabled((v) => !v)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${validityEnabled ? 'bg-[#e8f6fc] text-[#025373]' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {validityEnabled ? 'Activada' : 'Sin validez'}
                        </button>
                      </div>
                      {validityEnabled ? (
                        <>
                          <input
                            id="budget-validity"
                            type="text"
                            className={INPUT_CLS}
                            value={validity}
                            onChange={(e) => setValidity(e.target.value)}
                            placeholder="Ej: 15 días"
                          />
                          <div className="flex gap-1.5 mt-2">
                            {['7 días', '15 días', '30 días'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setValidity(opt)}
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all ${validity === opt ? 'bg-[#e8f6fc] text-[#025373]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="px-3.5 py-3 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 italic">
                          No se mostrará validez en el presupuesto
                        </div>
                      )}
                    </div>

                    {initialData && (
                      <div>
                        <label htmlFor="budget-status" className={LABEL_CLS}>Estado</label>
                        <select
                          id="budget-status"
                          className={`${INPUT_CLS} appearance-none`}
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Aceptado">Aceptado</option>
                          <option value="Rechazado">Rechazado</option>
                        </select>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <div className={LABEL_CLS}>Color del documento</div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {COLORS.map(({ name, value }) => (
                          <button
                            key={value}
                            type="button"
                            title={name}
                            aria-label={name}
                            aria-pressed={accentColor === value}
                            onClick={() => setAccentColor(value)}
                            className="w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: value,
                              borderColor: accentColor === value ? '#fff' : 'transparent',
                              outline: accentColor === value ? `3px solid ${value}` : 'none',
                              outlineOffset: '1px',
                            }}
                          >
                            {accentColor === value && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        ))}
                        <span className="text-xs font-semibold text-slate-600 ml-1">{colorName}</span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* 3 · Trabajos */}
                <Section step={3} title="Trabajos a presupuestar">
                  <BudgetItemEditor
                    items={items}
                    onItemsChange={setItems}
                    isManualMode={isManualMode}
                  />
                </Section>
              </div>

              {/* Summary */}
              <aside className="bg-[#081b26] text-white rounded-2xl p-5 lg:sticky lg:top-0">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8fd8ec]">Resumen</div>
                <dl className="mt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[#b7d4e0]">Ítems</dt>
                    <dd className="font-semibold">{includedCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#b7d4e0]">No incluidos</dt>
                    <dd className="font-semibold">{excludedCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#b7d4e0]">Validez</dt>
                    <dd className="font-semibold">{validityEnabled ? validity || '—' : 'Sin validez'}</dd>
                  </div>
                </dl>

                <div className="my-4 h-px bg-[#1d3a4a]" />

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isManualMode}
                    onChange={() => setIsManualMode(!isManualMode)}
                  />
                  <div className="w-11 h-6 rounded-full bg-white/25 peer-checked:bg-[#04b2d9] peer-focus-visible:ring-2 peer-focus-visible:ring-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  <span className="ml-3 text-sm font-medium text-[#e8f6fc]">Ingresar total manualmente</span>
                </label>
                {isManualMode && (
                  <div className="mt-3 flex items-center gap-2 text-[#8fd8ec]">
                    <AlertCircle size={14} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">Modo manual</span>
                  </div>
                )}

                <div className="mt-4 text-xs font-bold uppercase tracking-widest text-[#8fd8ec]">Total</div>
                {isManualMode ? (
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      aria-label="Total manual"
                      className="w-full min-h-[48px] pl-7 pr-3 rounded-xl bg-white text-[#081b26] text-xl font-extrabold outline-none focus:ring-2 focus:ring-[#04b2d9] text-right"
                      value={manualTotal}
                      onChange={(e) => setManualTotal(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums break-words">
                    {ARS(autoTotal)}
                  </div>
                )}
              </aside>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#cce6f0] bg-white shrink-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] px-4 rounded-xl border border-[#cce6f0] bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              data-tour="budget-form-submit"
              type="submit"
              className="flex-[2] min-h-[48px] px-4 rounded-xl font-bold hover:opacity-90 shadow-lg transition-all flex items-center justify-center gap-2"
              style={{ background: 'var(--color-brand-blue)', color: 'white' }}
            >
              <CheckCircle2 size={18} />
              {initialData ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

