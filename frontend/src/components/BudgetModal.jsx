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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
      <div className="flex min-h-full items-stretch justify-center p-0 md:items-center md:p-6">
        <form
          onSubmit={handleSubmit}
          data-tour="budget-modal"
          className="bg-white w-full min-h-screen shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:min-h-0 md:max-w-4xl md:my-auto md:max-h-[calc(100dvh-3rem)] md:rounded-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <Edit3 className="text-primary-600" size={20} />
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
              </h2>
            </div>
            <button onClick={onClose} type="button" className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {/* Top Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="md:col-span-1 relative" data-tour="budget-form-client">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cliente</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="Buscar o crear..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    value={client}
                    onChange={(e) => {
                      setClient(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {showClientDropdown ? <Search size={14} /> : <User size={14} />}
                  </div>
                </div>

                {showClientDropdown && client.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((c) => (
                        <div
                          key={c.id}
                          className="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm text-slate-700 flex items-center gap-2"
                          onClick={() => {
                            setClient(c.name);
                            setShowClientDropdown(false);
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          {c.name}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-slate-400 italic">
                        Presiona enter para usar "{client}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fecha</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Validez</label>
                  <button
                    type="button"
                    onClick={() => setValidityEnabled(v => !v)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${validityEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {validityEnabled ? 'Activada' : 'Sin validez'}
                  </button>
                </div>
                {validityEnabled ? (
                  <>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      value={validity}
                      onChange={(e) => setValidity(e.target.value)}
                      placeholder="Ej: 15 días"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      {['7 días', '15 días', '30 días'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setValidity(opt)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-all ${validity === opt ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-2 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 italic">
                    No se mostrará validez en el presupuesto
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Color del presupuesto</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { name: 'Azul',    value: '#2563eb' },
                    { name: 'Rojo',    value: '#dc2626' },
                    { name: 'Verde',   value: '#16a34a' },
                    { name: 'Amarillo',value: '#ca8a04' },
                    { name: 'Naranja', value: '#ea580c' },
                    { name: 'Violeta', value: '#9333ea' },
                    { name: 'Negro',   value: '#1e293b' },
                  ].map(({ name, value }) => (
                    <button
                      key={value}
                      type="button"
                      title={name}
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
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-1" style={{ color: accentColor }}>■ {['Azul','Rojo','Verde','Amarillo','Naranja','Violeta','Negro'][['#2563eb','#dc2626','#16a34a','#ca8a04','#ea580c','#9333ea','#1e293b'].indexOf(accentColor)] ?? 'Personalizado'}</span>
                </div>
              </div>

              {initialData && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Estado</label>
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aceptado">Aceptado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── Budget Item Editor (mobile + desktop) ── */}
            <BudgetItemEditor
              items={items}
              onItemsChange={setItems}
              isManualMode={isManualMode}
            />
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isManualMode}
                    onChange={() => {
                      setIsManualMode(!isManualMode);
                    }}
                  />
                  <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ background: 'var(--color-brand-blue)' }}></div>
                  <span className="ml-3 text-sm font-medium text-slate-600">Ingresar total manualmente</span>
                </label>
                {isManualMode && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-lg animate-in slide-in-from-left-2 duration-300">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Modo Manual</span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                {!isManualMode && <span className="text-slate-500 text-sm font-semibold uppercase">Total</span>}
                {isManualMode ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-32 pl-6 pr-2 py-1 border border-primary-500 rounded-lg text-lg font-bold text-primary-600 outline-none shadow-sm focus:ring-2 focus:ring-primary-200 text-right"
                      value={manualTotal}
                      onChange={(e) => setManualTotal(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <span className="text-2xl font-black text-primary-600 min-w-[120px] text-right">
                    {ARS(autoTotal)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                data-tour="budget-form-submit"
                type="submit"
                className="flex-[2] py-3 px-4 rounded-xl font-bold hover:opacity-90 shadow-lg transition-all flex items-center justify-center gap-2" style={{ background: 'var(--color-brand-blue)', color: 'white' }}
              >
                <CheckCircle2 size={18} />
                {initialData ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
