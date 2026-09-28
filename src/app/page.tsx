'use client';

import React, { useState, useEffect } from 'react';
import { Contact } from '@/types/crm';
import { OUTCROP_TAGS } from '@/lib/constants';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar, ActiveTab } from '@/components/layout/Sidebar';
import { MagicLogin } from '@/components/auth/MagicLogin';
import { Contact360View } from '@/components/contacts/Contact360View';
import { ContactModal } from '@/components/contacts/ContactModal';
import { VoiceNoteRecorder } from '@/components/contacts/VoiceNoteRecorder';
import { ContactGraphView } from '@/components/graph/ContactGraphView';
import { KanbanPipeline } from '@/components/pipeline/KanbanPipeline';
import { WorkflowsManager } from '@/components/workflows/WorkflowsManager';
import { WhatsAppManager } from '@/components/whatsapp/WhatsAppManager';
import { ThemeCustomizer } from '@/components/settings/ThemeCustomizer';
import { ConcaveCard } from '@/components/ui/ConcaveCard';
import { DailyScheduleWidget } from '@/components/ui/DailyScheduleWidget';
import { IRMetricsDashboard } from '@/components/analytics/IRMetricsDashboard';
import { SyndicateManager } from '@/components/syndicates/SyndicateManager';
import { RoadshowManager } from '@/components/roadshows/RoadshowManager';
import { SocialCalendarManager } from '@/components/social/SocialCalendarManager';
import SuperAdminDashboard from '@/components/admin/SuperAdminDashboard';
import WhatsAppOtpLogin from '@/components/auth/WhatsAppOtpLogin';
import RealWebRtcRoom from '@/components/video/RealWebRtcRoom';
import UserRoleManager from '@/components/users/UserRoleManager';
import BackupManager from '@/components/admin/BackupManager';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ImportCSVModal } from '@/components/contacts/ImportCSVModal';
import { FinancialTickerWidget } from '@/components/analytics/FinancialTickerWidget';
import { MediaDriveManager } from '@/components/drive/MediaDriveManager';
import { HermesAgentStudio } from '@/components/hermes/HermesAgentStudio';
import { initTheme } from '@/lib/themeEngine';

import {
  Plus,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Clock,
  Calendar,
  Video,
  Flame,
  Mail,
  CheckCircle2,
  Search,
  ChevronDown,
  Download,
  Upload,
  LayoutGrid,
  List,
  Table,
} from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  // State Initialization with LocalStorage Persistence for seamless page reloads
  const [activeTabState, setActiveTabState] = useState<ActiveTab>('contacts');
  const [viewMode, setViewMode] = useState<'SUPER_ADMIN_CONSOLE' | 'TENANT_CRM'>('TENANT_CRM');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [contactViewMode, setContactViewMode] = useState<'grid' | 'list' | 'table'>('grid');

  // ActiveTab Setter with Persistence
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('crm_active_tab', tab);
    } catch (e) {}
  };

  const activeTab = activeTabState;

  useEffect(() => {
    // Initialize & sync full custom theme Engine (Colors, Fonts, Container Geometry)
    initTheme();

    // Restore persisted tab on mount
    try {
      const savedTab = localStorage.getItem('crm_active_tab') as ActiveTab;
      if (savedTab) setActiveTabState(savedTab);
      const savedTenant = localStorage.getItem('crm_selected_tenant');
      if (savedTenant) setSelectedTenant(JSON.parse(savedTenant));
      const savedViewMode = localStorage.getItem('crm_view_mode') as any;
      if (savedViewMode) setViewMode(savedViewMode);
    } catch (e) {}

    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (false) { // Forced Single Tenant
            const savedViewMode = localStorage.getItem('crm_view_mode');
            if (savedViewMode === 'SUPER_ADMIN_CONSOLE') {
              setViewMode('SUPER_ADMIN_CONSOLE');
            } else {
              setViewMode('TENANT_CRM');
            }
          } else {
            setViewMode('TENANT_CRM');
            if (data.user.tenant) {
              setSelectedTenant(data.user.tenant);
              setBrandName(data.user.tenant.name);
            }
          }
        }
      })
      .catch(() => setUser(null));
  }, []);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');

  const [tenants, setTenants] = useState<any[]>([]);
  const [showOtpLoginModal, setShowOtpLoginModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Modals
  const [selectedContact360, setSelectedContact360] = useState<Contact | null>(null);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');

  // Branding Customization state with Official Outcrop Web Palette default (#00dfdf True Cyan & #a9aeb2 Metallic Silver)
  const [brandName, setBrandName] = useState('Copper Giant');
  const [brandLogo, setBrandLogo] = useState('/logo.png');
  const [primaryColor, setPrimaryColor] = useState('#00dfdf');
  const [accentPurple, setAccentPurple] = useState('#a9aeb2');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      setBrandName(selectedTenant.name || 'Copper Giant');
      if (selectedTenant.logoUrl) setBrandLogo(selectedTenant.logoUrl);
      if (selectedTenant.primaryColor) {
        setPrimaryColor(selectedTenant.primaryColor);
        document.documentElement.style.setProperty('--primary-color', selectedTenant.primaryColor);
      }
    }
  }, [selectedTenant]);

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedTenant?.id) return;
    fetch('/api/calendar/events?tenantId=' + selectedTenant.id)
      .then(r => r.json())
      .then(data => { if (data.success) setUpcomingEvents((data.events || []).slice(0, 3)); })
      .catch(() => {});
  }, [selectedTenant]);

  useEffect(() => {
    fetchContacts();
    // Real-Time Background Synchronization (2.5s interval) for zero-refresh UI updates!
    const syncInterval = setInterval(() => {
      fetchContacts(true);
    }, 2500);
    return () => clearInterval(syncInterval);
  }, [searchTerm, selectedType, selectedStage, selectedSource, selectedTenant]);

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (data.success && data.tenants) {
        setTenants(data.tenants);
        if (!selectedTenant && data.tenants.length > 0) {
          // Strictly default to Outcrop Silver Corp — never leak or pick arbitrary tenants
          const outcrop = data.tenants.find((t: any) => t.slug === 'coppergiant') || data.tenants[0];
          setSelectedTenant(outcrop);
          setBrandName(outcrop.name);
          try {
            localStorage.setItem('crm_selected_tenant', JSON.stringify(outcrop));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
    }
  };

  const fetchContacts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (searchTerm) query.append('search', searchTerm);
      const activeTenantId = selectedTenant?.id || '1757cddf-5974-4184-9bb1-d5f4f7e931be';
      query.append('tenantId', activeTenantId);
      
      if (selectedType && selectedType !== 'ALL') {
        if (selectedType === 'Hot Client' || selectedType === 'Great Interest') {
          query.append('interestLevel', 'High');
        } else if (selectedType === 'Medium Interest') {
          query.append('interestLevel', 'Medium');
        } else if (selectedType === 'Low Interest') {
          query.append('interestLevel', 'Low');
        } else {
          query.append('investorType', selectedType);
        }
      }
      
      if (selectedStage !== 'ALL') query.append('stage', selectedStage);
      if (selectedSource !== 'ALL') query.append('source', selectedSource);

      const res = await fetch(`/api/contacts?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.contacts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert('No hay contactos en la lista para exportar.');
      return;
    }
    const headers = ['ID', 'Nombre', 'Empresa', 'Cargo', 'Email', 'Telefono', 'WhatsApp', 'Ubicacion', 'Etapa', 'Nivel Interes', 'Fuente', 'Lead Score', 'Fecha Creado'];
    const rows = contacts.map(c => [
      `"${c.id}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.company || '').replace(/"/g, '""')}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.whatsapp || '').replace(/"/g, '""')}"`,
      `"${(c.location || '').replace(/"/g, '""')}"`,
      `"${(c.stage || '').replace(/"/g, '""')}"`,
      `"${(c.interestLevel || '').replace(/"/g, '""')}"`,
      `"${(c.source || '').replace(/"/g, '""')}"`,
      c.leadScore || 0,
      `"${new Date(c.createdAt).toLocaleDateString('es-CO')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contactos_${selectedTenant?.slug || 'the-core'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <MagicLogin
        onLoginSuccess={(usr) => {
          setUser(usr);
          if (false) { // Forced Single Tenant
            setViewMode('SUPER_ADMIN_CONSOLE');
          } else {
            setViewMode('TENANT_CRM');
            if (usr.tenant) {
              setSelectedTenant(usr.tenant);
              setBrandName(usr.tenant.name);
            }
          }
        }}
        brandName={brandName}
      />
    );
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOGOUT' }),
      });
    } catch (e) {}
    setUser(null);
    try {
      localStorage.removeItem('crm_view_mode');
      localStorage.removeItem('crm_selected_tenant');
    } catch (e) {}
    window.location.href = '/';
  };

  // 1. STANDALONE MASTER SUPER ADMIN CONSOLE — only for SUPER_ADMIN role
  if (viewMode === 'SUPER_ADMIN_CONSOLE' && user?.role === 'SUPER_ADMIN') {
    return (
