import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Settings,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  Save,
  FileText,
} from 'lucide-react';
import { companyService } from '../services/api';

const BRANDING_FIELDS = [
  { key: 'name', label: 'Nombre / Título', placeholder: 'Ej: OctopusFlow de Juan Pérez', hint: 'Aparece en el encabezado del PDF' },
  { key: 'company_name', label: 'Nombre de Empresa', placeholder: 'Ej: Constructora López SRL', hint: 'Nombre comercial' },
  { key: 'business_name', label: 'Razón Social', placeholder: 'Ej: López & Asociados SRL', hint: 'Razón social legal' },
  { key: 'tax_id', label: 'CUIT / RUT / NIF', placeholder: 'Ej: 30-12345678-9', hint: 'Identificación fiscal' },
  { key: 'address', label: 'Dirección', placeholder: 'Ej: Av. Libertador 1234, CABA', hint: 'Dirección de la empresa' },
  { key: 'phone', label: 'Teléfono', placeholder: 'Ej: +54 11 1234-5678', hint: 'Teléfono de contacto' },
  { key: 'email_contact', label: 'Email de Contacto', placeholder: 'Ej: contacto@miempresa.com', hint: 'Email público (diferente al de login)' },
  { key: 'payment_terms', label: 'Términos de Pago', placeholder: 'Ej: Efectivo,Transferencia,Tarjeta', hint: 'Aparece en el PDF' },
];

const DEFAULT_LOGO_SIZE = 180;
const MIN_LOGO_SIZE = 80;
const MAX_LOGO_SIZE = 320;
const DEFAULT_PDF_FONT_SIZE = 13;
const MIN_PDF_FONT_SIZE = 10;
const MAX_PDF_FONT_SIZE = 18;
const DEFAULT_PDF_DESCRIPTION_FONT_SIZE = 14;
const MIN_PDF_DESCRIPTION_FONT_SIZE = 11;
const MAX_PDF_DESCRIPTION_FONT_SIZE = 22;

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('logo'); // 'logo' | 'company' | 'pdf'
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [existingLogo, setExistingLogo] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoStatus, setLogoStatus] = useState(null);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [companyData, setCompanyData] = useState({});
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyStatus, setCompanyStatus] = useState(null); // { type: 'success'|'error', message: string }
  const fileInputRef = useRef(null);

  const revokeObjectUrl = (url) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const updateExistingLogo = (nextUrl) => {
    setExistingLogo((previousUrl) => {
      if (previousUrl && previousUrl !== nextUrl) {
        revokeObjectUrl(previousUrl);
      }
      return nextUrl;
    });
  };

  // Load company settings when switching to company tab
  const loadCompanySettings = async () => {
    try {
      setCompanyLoading(true);
      const data = await companyService.getSettings();
      setCompanyData(data);
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      setCompanyLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreview(null);
      updateExistingLogo(null);
      setLogoStatus(null);
      setCompanyStatus(null);
      setDeletingLogo(false);
      setActiveTab('logo');
      checkExistingLogo();
      loadCompanySettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'company' && Object.keys(companyData).length === 0) {
      loadCompanySettings();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(existingLogo);
    };
  }, [existingLogo]);

  const checkExistingLogo = async () => {
    try {
      const logoBlob = await companyService.getLogo();
      const logoUrl = URL.createObjectURL(logoBlob);
      updateExistingLogo(logoUrl);
    } catch (err) {
      updateExistingLogo(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);
        setLogoStatus(null);
      } else {
        alert('Por favor selecciona un archivo de imagen válido');
      }
    }
  };

  const handleSaveLogo = async () => {
    try {
      setLogoLoading(true);
      if (selectedFile) {
        await companyService.uploadLogo(selectedFile);
      }

      const savedSettings = await companyService.updateSettings({
        logo_size: Number(companyData.logo_size) || DEFAULT_LOGO_SIZE,
      });
      setCompanyData(savedSettings);
      setLogoStatus('success');
      await checkExistingLogo();
      setPreview(null);
      setSelectedFile(null);

      setTimeout(() => {
        setLogoStatus(null);
      }, 1500);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setLogoStatus('error');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (deletingLogo) return;
    try {
      setDeletingLogo(true);
      await companyService.deleteLogo();
      revokeObjectUrl(existingLogo);
      updateExistingLogo(null);
      setLogoStatus('deleted');
      setTimeout(() => setLogoStatus(null), 2000);
    } catch (error) {
      console.error('Error deleting logo:', error);
      setLogoStatus('delete-error');
    } finally {
      setDeletingLogo(false);
    }
  };

  const handleSaveCompany = async () => {
    try {
      setCompanySaving(true);
      await companyService.updateSettings(companyData);
      setCompanyStatus({ type: 'success', message: 'Configuración guardada correctamente' });
      setTimeout(() => setCompanyStatus(null), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setCompanyStatus({ type: 'error', message: 'Error al guardar. Intentá de nuevo.' });
    } finally {
      setCompanySaving(false);
    }
  };

  const handleSavePdf = async () => {
    try {
      setCompanySaving(true);
      const savedSettings = await companyService.updateSettings({
        pdf_font_size: Number(companyData.pdf_font_size) || DEFAULT_PDF_FONT_SIZE,
        pdf_description_font_size: Number(companyData.pdf_description_font_size) || DEFAULT_PDF_DESCRIPTION_FONT_SIZE,
      });
      setCompanyData(savedSettings);
      setCompanyStatus({ type: 'success', message: 'Configuración del PDF guardada correctamente' });
      setTimeout(() => setCompanyStatus(null), 2000);
    } catch (error) {
      console.error('Error saving PDF settings:', error);
      setCompanyStatus({ type: 'error', message: 'Error al guardar. Intentá de nuevo.' });
    } finally {
      setCompanySaving(false);
    }
  };

  if (!isOpen) return null;

  const logoSize = Number(companyData.logo_size) || DEFAULT_LOGO_SIZE;
  const logoPreviewSrc = preview || existingLogo;
  const pdfFontSize = Number(companyData.pdf_font_size) || DEFAULT_PDF_FONT_SIZE;
  const pdfDescriptionFontSize = Number(companyData.pdf_description_font_size) || DEFAULT_PDF_DESCRIPTION_FONT_SIZE;
  const handleSaveActiveSettings = activeTab === 'pdf' ? handleSavePdf : handleSaveCompany;
  const saveButtonLabel = activeTab === 'pdf' ? 'Guardar PDF' : 'Guardar Empresa';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Settings className="text-primary-600" size={20} />
            <h2 className="text-lg font-bold text-slate-800">Configuración</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            onClick={() => setActiveTab('logo')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logo'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon size={14} className="inline mr-1.5 mb-0.5" />
            Logo
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'company'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building2 size={14} className="inline mr-1.5 mb-0.5" />
            Mi Empresa
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-3 px-1 ml-5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pdf'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} className="inline mr-1.5 mb-0.5" />
            PDF
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* === LOGO TAB === */}
          {activeTab === 'logo' && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">Logo / Encabezado</h3>
              <p className="text-sm text-slate-500 mb-4">
                Subí una imagen y ajustá su tamaño para que aparezca en el encabezado de los presupuestos PDF.
              </p>

              <div
                className={`rounded-xl border p-4 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                  preview ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />

                {logoPreviewSrc ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-20 rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-center justify-center shrink-0">
                        <img src={logoPreviewSrc} alt="Logo seleccionado" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700">{preview ? 'Nueva imagen seleccionada' : 'Logo actual'}</p>
                        <p className="text-xs text-slate-400">Clic para cambiar la imagen</p>
                      </div>
                    </div>
                    {existingLogo && !preview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLogo();
                        }}
                        disabled={deletingLogo}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-all border border-red-200 disabled:opacity-50 shrink-0"
                      >
                        {deletingLogo ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-600">Haz clic para subir imagen</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG recomendado</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <label htmlFor="logo-size" className="text-sm font-bold text-slate-700">
                      Tamaño del logo
                    </label>
                    <p className="text-xs text-slate-400">Ajusta el ancho usado en el PDF</p>
                  </div>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1">
                    {logoSize}px
                  </span>
                </div>
                <input
                  id="logo-size"
                  type="range"
                  min={MIN_LOGO_SIZE}
                  max={MAX_LOGO_SIZE}
                  step="10"
                  value={logoSize}
                  onChange={(e) =>
                    setCompanyData((prev) => ({ ...prev, logo_size: Number(e.target.value) }))
                  }
                  className="w-full accent-primary-600"
                />

                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Vista preliminar del encabezado
                  </div>
                  <div className="flex min-h-[120px] items-start justify-between gap-6 border-t-4 border-primary-600 pt-6">
                    <div className="flex min-h-24 flex-1 items-start">
                      {logoPreviewSrc ? (
                        <img
                          src={logoPreviewSrc}
                          alt="Vista preliminar del logo en PDF"
                          className="max-h-24 object-contain object-left"
                          style={{ width: `${logoSize}px`, maxWidth: '100%' }}
                        />
                      ) : (
                        <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-400">
                          Sin logo
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-600">Presupuesto</p>
                      <p className="mt-1 text-xl font-black text-slate-900">PR-001</p>
                      <p className="mt-2 text-xs text-slate-400">Fecha: <span className="font-semibold text-slate-600">10/6/2026</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === COMPANY TAB === */}
          {activeTab === 'company' && (
            <div>
              {companyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
                  <span className="ml-3 text-sm text-slate-500">Cargando...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {BRANDING_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={companyData[field.key] || ''}
                        onChange={(e) =>
                          setCompanyData((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                      />
                      <p className="text-xs text-slate-400 mt-0.5">{field.hint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === PDF TAB === */}
          {activeTab === 'pdf' && (
            <div>
              <h3 className="font-bold text-slate-700 mb-2">Estilo del PDF</h3>
              <p className="text-sm text-slate-500 mb-4">
                Ajustá el tamaño de la letra de la tabla para que el presupuesto quede cómodo y legible.
              </p>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <label htmlFor="pdf-font-size" className="text-sm font-bold text-slate-700">
                        Tamaño de letra general
                      </label>
                      <p className="text-xs text-slate-400">Afecta cantidades, precios y totales de la tabla</p>
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1">
                      {pdfFontSize}px
                    </span>
                  </div>
                  <input
                    id="pdf-font-size"
                    type="range"
                    min={MIN_PDF_FONT_SIZE}
                    max={MAX_PDF_FONT_SIZE}
                    step="1"
                    value={pdfFontSize}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, pdf_font_size: Number(e.target.value) }))
                    }
                    className="w-full accent-primary-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <label htmlFor="pdf-description-font-size" className="text-sm font-bold text-slate-700">
                        Tamaño de descripción
                      </label>
                      <p className="text-xs text-slate-400">Afecta el texto principal de cada ítem</p>
                    </div>
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2.5 py-1">
                      {pdfDescriptionFontSize}px
                    </span>
                  </div>
                  <input
                    id="pdf-description-font-size"
                    type="range"
                    min={MIN_PDF_DESCRIPTION_FONT_SIZE}
                    max={MAX_PDF_DESCRIPTION_FONT_SIZE}
                    step="1"
                    value={pdfDescriptionFontSize}
                    onChange={(e) =>
                      setCompanyData((prev) => ({ ...prev, pdf_description_font_size: Number(e.target.value) }))
                    }
                    className="w-full accent-primary-600"
                  />
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Vista preliminar de la tabla
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-[1fr_72px_96px_96px] bg-primary-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white">
                      <span>Descripción</span>
                      <span className="text-right">Cant.</span>
                      <span className="text-right">P. Unitario</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="grid grid-cols-[1fr_72px_96px_96px] items-center gap-0 px-3 py-3 text-slate-600" style={{ fontSize: `${pdfFontSize}px` }}>
                      <span className="font-bold uppercase leading-tight text-slate-900" style={{ fontSize: `${pdfDescriptionFontSize}px` }}>
                        Reparación y mantenimiento general con materiales incluidos
                      </span>
                      <span className="text-right font-semibold">2</span>
                      <span className="text-right font-semibold">$45.000,00</span>
                      <span className="text-right font-semibold">$90.000,00</span>
                    </div>
                    <div className="grid grid-cols-[1fr_72px_96px_96px] items-center bg-slate-50 px-3 py-3 text-slate-600" style={{ fontSize: `${pdfFontSize}px` }}>
                      <span className="font-bold uppercase leading-tight text-slate-900" style={{ fontSize: `${pdfDescriptionFontSize}px` }}>
                        Mano de obra especializada
                      </span>
                      <span className="text-right font-semibold">1</span>
                      <span className="text-right font-semibold">$30.000,00</span>
                      <span className="text-right font-semibold">$30.000,00</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Si agrandás demasiado la letra, van a entrar menos ítems por página.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status messages */}
        <div className="px-6">
          {activeTab === 'logo' && logoStatus === 'success' && (
            <div className="mb-4 p-3 bg-primary-50 text-primary-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={16} />
              ¡Logo actualizado correctamente!
            </div>
          )}
          {activeTab === 'logo' && logoStatus === 'error' && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <AlertCircle size={16} />
              Error al subir la imagen.
            </div>
          )}
          {activeTab === 'logo' && logoStatus === 'deleted' && (
            <div className="mb-4 p-3 bg-primary-50 text-primary-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={16} />
              Logo eliminado correctamente.
            </div>
          )}
          {activeTab === 'logo' && logoStatus === 'delete-error' && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <AlertCircle size={16} />
              Error al eliminar el logo.
            </div>
          )}
          {activeTab !== 'logo' && companyStatus?.type === 'success' && (
            <div className="mb-4 p-3 bg-primary-50 text-primary-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={16} />
              {companyStatus.message}
            </div>
          )}
          {activeTab !== 'logo' && companyStatus?.type === 'error' && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 text-sm font-bold">
              <AlertCircle size={16} />
              {companyStatus.message}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm"
          >
            Cerrar
          </button>
          {activeTab === 'logo' ? (
            <button
              onClick={handleSaveLogo}
              disabled={logoLoading}
              className="flex-[2] py-2.5 rounded-xl text-white font-bold transition-all text-sm flex items-center justify-center gap-2"
              style={{
                background: logoLoading ? 'var(--color-text-muted)' : 'var(--color-brand-blue)'
              }}
            >
              {logoLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Upload size={16} />
                  Guardar Logo y Tamaño
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSaveActiveSettings}
              disabled={companySaving}
              className="flex-[2] py-2.5 rounded-xl text-white font-bold transition-all text-sm flex items-center justify-center gap-2"
              style={{
                background: companySaving ? 'var(--color-text-muted)' : 'var(--color-brand-blue)'
              }}
            >
              {companySaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={16} />
                  {saveButtonLabel}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
