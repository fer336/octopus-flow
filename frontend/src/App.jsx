import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Download,
  Calculator,
  Users,
  Settings,
  Eye,
  Edit2,
  Share2,
  LogOut // Logout icon
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import BudgetModal from './components/BudgetModal';
import StatusBadge from './components/StatusBadge';
import ClientsManager from './components/ClientsManager';
import SettingsModal from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import MembershipExpiredPage from './components/MembershipExpiredPage';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { budgetService } from './services/api';
import { useProductTour } from './tours/productTour';

export default function App() {
  const [user, setUser] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientsManagerOpen, setIsClientsManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [membershipExpired, setMembershipExpired] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, budget_id, client }
  
  // State for Editing
  const [editingBudget, setEditingBudget] = useState(null);
  const { startTour: startBudgetsTour } = useProductTour('presupuestos', {
    autoStart: Boolean(user),
    isReady: Boolean(user)
  });

  // Check login on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Basic check if expired
        if (decoded.exp * 1000 < Date.now()) {
          handleLogout();
        } else {
          setUser(decoded);
          loadBudgets();
        }
      } catch (e) {
        handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = user ? 'var(--color-bg-primary)' : 'transparent';
    return () => {
      document.body.style.backgroundColor = 'var(--color-bg-primary)';
    };
  }, [user]);

  const handleLoginSuccess = (token) => {
    localStorage.setItem('token', token);
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
      loadBudgets();
    } catch (e) {
      console.error("Invalid token", e);
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setBudgets([]);
  };

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await budgetService.getAll();
      setBudgets(data);
      setError(null);
      } catch (err) {
        console.error('Error loading budgets:', err);
      if (err.response && err.response.status === 401) {
        handleLogout();
      } else if (err.response && err.response.status === 403 && err.response.data?.detail === 'MEMBERSHIP_EXPIRED') {
        handleLogout();
        setMembershipExpired(true);
      } else {
        setError('Error al cargar los presupuestos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateBudget = async (budgetData) => {
    try {
      if (editingBudget) {
        // Update existing budget
        const updated = await budgetService.update(editingBudget.id, budgetData);
        setBudgets(budgets.map(b => b.id === updated.id ? updated : b));
      } else {
        // Create new budget
        const created = await budgetService.create(budgetData);
        setBudgets([created, ...budgets]);
      }
      setIsModalOpen(false);
      setEditingBudget(null);
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Error al guardar el presupuesto');
    }
  };

  const openNewBudgetModal = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const openEditBudgetModal = async (budget) => {
    try {
      // Fetch full details including items before opening modal
      const fullBudget = await budgetService.getById(budget.id);
      setEditingBudget(fullBudget);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching budget details:', err);
      alert('Error al cargar detalles del presupuesto');
    }
  };

  const requestDelete = (budget) => {
    setDeleteTarget({ id: budget.id, budget_id: budget.budget_id, client: budget.client });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await budgetService.delete(deleteTarget.id);
      setBudgets(budgets.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting budget:', err);
      alert('Error al eliminar el presupuesto');
    }
  };

  const cancelDelete = () => setDeleteTarget(null);

  const handleViewPDF = (id) => {
    const API_URL = import.meta.env.VITE_API_URL || 'https://login-flow.octopustrack.shop/api';
    const url = `${API_URL}/budgets/${id}/pdf?token=${localStorage.getItem('token')}`; // Send token in query for browser viewing if needed, but standard auth header is better if using blob
    // Simplest for now: Open URL. Backend auth might block this if strict.
    // Ideally: Fetch blob with auth header -> Create Object URL -> Open.
    // For now, let's try direct open but passing token as query param if backend supports it or relying on cookie (not used here).
    // Better Approach: Fetch Blob.
    
    // Quick Fix: Allow token in query param or just use fetch blob method for "View" as well
    // Or just accept that "View" might need to handle auth. 
    // Let's implement fetch-blob-view for maximum security.
    viewPdfSecurely(id);
  };
  
  const viewPdfSecurely = async (id) => {
    try {
        const response = await budgetService.generatePDF(id);
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (e) {
        alert('Error al visualizar PDF');
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      // Re-use the secure blob method but trigger download
      const response = await budgetService.generatePDF(id); // Ensure this returns blob in api.js (it does responseType: blob)
      // Actually api.js currently returns response.data. If responseType is blob, response.data IS the blob.
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // We don't have filename easily here without headers inspection, but "Presupuesto.pdf" is okay fallback
      link.setAttribute('download', `Presupuesto_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Error al descargar PDF');
    }
  };

  const handleSharePDF = async (id, budgetCode, clientName) => {
    try {
      const response = await budgetService.generatePDF(id);
      const blob = new Blob([response], { type: 'application/pdf' });
      const file = new File([blob], `Presupuesto_${budgetCode}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Presupuesto ${budgetCode}`,
          text: `Presupuesto ${budgetCode} para ${clientName}`,
        });
      } else {
         // Fallback link sharing is tricky with secure auth.
         alert('Compartí el archivo PDF por WhatsApp.');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('No se pudo compartir el archivo.');
    }
  };

  const filteredBudgets = budgets.filter(b => 
    b.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.budget_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (membershipExpired) {
    return <MembershipExpiredPage onBackToLogin={() => setMembershipExpired(false)} />;
  }

  // --- RENDER LOGIN IF NO USER ---
  if (!user) {
    return (
      <LoginPage
        onSuccess={handleLoginSuccess}
        onError={(code) => {
          if (code === 'MEMBERSHIP_EXPIRED') {
            setMembershipExpired(true);
          } else {
            setError('Login Failed');
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-12 flex items-center justify-between px-2 md:px-3 z-10" style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          {/* Octopus Logo */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center">
            <img
              src="/images/logos/logo-header@1x.png"
              srcSet="/images/logos/logo-header@1x.png 1x, /images/logos/logo-header@2x.png 2x, /images/logos/logo-header@3x.png 3x"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold text-base tracking-tight hidden md:block" style={{ color: 'var(--color-brand-dark)' }}>OctopusFlow</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          {/* User Info */}
          <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--color-bg-tertiary)' }}>
            {user.picture && <img src={user.picture} alt="Profile" className="w-6 h-6 rounded-full" />}
            <span className="text-xs font-bold max-w-[100px] truncate" style={{ color: 'var(--color-text-secondary)' }}>{user.name}</span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
            title="Configuración"
          >
            <Settings size={20} />
          </button>

          <button 
            onClick={() => setIsClientsManagerOpen(true)}
            className="text-slate-600 hover:text-primary-600 hover:bg-primary-50 px-2 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2"
          >
            <Users size={18} />
            <span className="hidden md:inline">Clientes</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-full transition-all md:hidden"
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="hidden md:flex text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg font-medium transition-all items-center gap-2"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>

          <button
            type="button"
            data-tour="budgets-tour-button"
            onClick={() => startBudgetsTour()}
            className="text-slate-600 hover:text-primary-600 hover:bg-primary-50 px-2 py-1.5 rounded-lg font-medium transition-all border border-slate-200 bg-white text-xs md:text-sm"
          >
            Ver tour
          </button>

          <button 
            onClick={openNewBudgetModal}
            data-tour="budgets-new-button"
            className="px-2 md:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm text-xs md:text-sm"
            style={{ background: 'var(--color-brand-blue)', color: 'white' }}
            title="Nuevo Presupuesto"
          >
            <Plus size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 pb-4 px-2 md:px-3 w-full max-w-none">
        {/* Filters & Search */}
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm mb-3 flex flex-col md:flex-row gap-2 items-center justify-between">
          <div className="relative w-full flex-1" data-tour="budgets-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente o ID..." 
               className="w-full pl-10 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 w-full md:w-auto justify-end" data-tour="budgets-total">
            <span>Total: <strong>{filteredBudgets.length}</strong></span>
          </div>
        </div>

        <div data-tour="budgets-list">
        {/* Mobile Cards View */}
        <div className="md:hidden space-y-2">
          {loading ? (
             <div className="text-center py-8">
               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
             </div>
          ) : filteredBudgets.map((budget) => (
            <div key={budget.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{budget.budget_id}</span>
                  <h3 className="font-bold text-slate-800 mt-1">{budget.client}</h3>
                </div>
                <StatusBadge status={budget.status} />
              </div>
              
              <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-2">
                <div>
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="text-sm font-medium text-slate-700">{new Date(budget.date).toLocaleDateString('es-ES')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="text-lg font-black text-slate-900">${budget.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => handleViewPDF(budget.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 text-sm font-bold hover:bg-primary-100 transition-colors"
                >
                  <Eye size={16} />
                  Ver
                </button>
                <button 
                  onClick={() => handleSharePDF(budget.id, budget.budget_id, budget.client)}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Compartir por WhatsApp"
                >
                  <Share2 size={16} />
                </button>
                <button 
                  onClick={() => openEditBudgetModal(budget)}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => requestDelete(budget)}
                  className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden w-full">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-slate-500 mt-3">Cargando presupuestos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-center">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[25%]" />
                  <col className="w-[15%]" />
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">ID</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Cliente</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Fecha</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Total</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Estado</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBudgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-2 py-1.5 font-mono text-xs font-medium text-primary-600 whitespace-nowrap">{budget.budget_id}</td>
                      <td className="px-2 py-1.5 text-sm font-medium text-slate-800 truncate">{budget.client}</td>
                      <td className="px-2 py-1.5 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(budget.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-2 py-1.5 text-sm font-bold text-slate-900 whitespace-nowrap">
                        ${budget.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5">
                        <StatusBadge status={budget.status} />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button 
                            onClick={() => handleViewPDF(budget.id)}
                            className="p-1 hover:bg-white rounded-full border border-transparent hover:border-primary-200 text-slate-400 hover:text-primary-600 shadow-sm transition-all"
                            title="Ver Presupuesto"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            onClick={() => handleSharePDF(budget.id, budget.budget_id, budget.client)}
                            className="p-1 hover:bg-white rounded-full border border-transparent hover:border-primary-200 text-slate-400 hover:text-primary-600 shadow-sm transition-all"
                            title="Compartir"
                          >
                            <Share2 size={15} />
                          </button>
                          <button 
                            onClick={() => openEditBudgetModal(budget)}
                            className="p-1 hover:bg-white rounded-full border border-transparent hover:border-slate-200 text-slate-400 hover:text-primary-600 shadow-sm transition-all"
                            title="Editar Presupuesto"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => requestDelete(budget)}
                            className="p-1 hover:bg-white rounded-full border border-transparent hover:border-slate-200 text-slate-400 hover:text-red-500 shadow-sm transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </main>

      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateOrUpdateBudget} 
        initialData={editingBudget}
      />
      <ClientsManager isOpen={isClientsManagerOpen} onClose={() => setIsClientsManagerOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        budgetId={deleteTarget?.budget_id}
        client={deleteTarget?.client}
      />
    </div>
  );
}
