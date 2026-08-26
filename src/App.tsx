import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { AuthPages } from './components/auth/AuthPages';
import { Header } from './components/common/Header';
import type { NavTab } from './components/common/Sidebar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { BOQEditor } from './components/boq/BOQEditor';
import { BOQsList } from './components/boq/BOQsList';
import { ExcelImporterModal } from './components/boq/ExcelImporterModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { TemplatesModal } from './components/templates/TemplatesModal';
import { ItemLibraryModal } from './components/library/ItemLibraryModal';
import { VendorPriceModal } from './components/vendor/VendorPriceModal';
import type { BOQ, BOQTemplate, ItemLibraryProduct, SystemSettings, VendorPrice } from './types';
import { getBOQsList } from './services/boqService';
import { getBOQTemplates, getItemLibraryProducts, getSystemSettings, getVendorPrices, DEFAULT_SETTINGS } from './services/adminService';

export const AppContent: React.FC = () => {
  const { currentUser, userProfile, loading, isAdmin } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  // Data states
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [templates, setTemplates] = useState<BOQTemplate[]>([]);
  const [itemLibrary, setItemLibrary] = useState<ItemLibraryProduct[]>([]);
  const [vendorPrices, setVendorPrices] = useState<VendorPrice[]>([]);

  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Selected BOQ for editing/viewing
  const [editingBOQ, setEditingBOQ] = useState<BOQ | null>(null);

  // Load backend data whenever auth state, profile or permissions are updated
  useEffect(() => {
    if (currentUser) {
      refreshData();
    } else {
      setBoqs([]);
      setTemplates([]);
      setItemLibrary([]);
      setVendorPrices([]);
      setEditingBOQ(null);
    }
  }, [currentUser?.uid, userProfile?.uid, isAdmin]);

  const refreshData = async () => {
    setIsDataLoading(true);
    try {
      const [fetchedSettings, fetchedBOQs, fetchedTemplates, fetchedLibrary, fetchedVendors] = await Promise.all([
        getSystemSettings(isAdmin),
        getBOQsList(userProfile?.uid || currentUser?.uid, isAdmin),
        getBOQTemplates(),
        getItemLibraryProducts(),
        getVendorPrices()
      ]);

      setSettings(fetchedSettings);
      setBoqs(fetchedBOQs);
      setTemplates(fetchedTemplates);
      setItemLibrary(fetchedLibrary);
      setVendorPrices(fetchedVendors);
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="font-semibold text-sm text-slate-400">Loading ZAJCO BOQ Maker Platform...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPages />;
  }

  // Handle template selection
  const handleSelectTemplate = (template: BOQTemplate) => {
    const defaultBOQ: Partial<BOQ> = {
      projectName: template.name,
      system: template.system,
      brand: template.brand,
      items: template.defaultItems.map((i, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        ...i,
        serialNumber: idx + 1
      }))
    };
    setEditingBOQ(defaultBOQ as BOQ);
    setCurrentTab('create-boq');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header settings={settings} />

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'create-boq') {
              setEditingBOQ(null);
            }
            setCurrentTab(tab);
          }}
        />

        {/* Main Workspace View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          
          {currentTab === 'dashboard' && (
            <DashboardOverview
              boqs={boqs}
              settings={settings}
              isLoading={isDataLoading}
              onRefresh={refreshData}
              onCreateBOQ={() => { setEditingBOQ(null); setCurrentTab('create-boq'); }}
              onImportExcel={() => setCurrentTab('excel-import')}
              onViewBOQ={(b) => { setEditingBOQ(b); setCurrentTab('create-boq'); }}
              onEditBOQ={(b) => { setEditingBOQ(b); setCurrentTab('create-boq'); }}
              onOpenTemplates={() => setCurrentTab('templates')}
            />
          )}

          {currentTab === 'create-boq' && (
            <BOQEditor
              key={editingBOQ?.id || 'new'}
              initialBOQ={editingBOQ}
              settings={settings}
              itemLibrary={itemLibrary}
              onBack={() => setCurrentTab('boqs-list')}
              onSaved={() => refreshData()}
            />
          )}

          {currentTab === 'boqs-list' && (
            <BOQsList
              boqs={boqs}
              settings={settings}
              isLoading={isDataLoading}
              onEditBOQ={(b) => { setEditingBOQ(b); setCurrentTab('create-boq'); }}
              onViewBOQ={(b) => { setEditingBOQ(b); setCurrentTab('create-boq'); }}
              onCreateNew={() => { setEditingBOQ(null); setCurrentTab('create-boq'); }}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'excel-import' && (
            <ExcelImporterModal
              conversionRate={settings.eurToSarRate}
              settings={settings}
              onImportComplete={(importedItems) => {
                const tempBOQ: Partial<BOQ> = {
                  projectName: 'Imported Excel BOQ',
                  items: importedItems
                };
                setEditingBOQ(tempBOQ as BOQ);
                setCurrentTab('create-boq');
              }}
            />
          )}

          {currentTab === 'templates' && (
            <TemplatesModal
              templates={templates}
              conversionRate={settings.eurToSarRate}
              onSelectTemplate={handleSelectTemplate}
            />
          )}

          {currentTab === 'item-library' && (
            <ItemLibraryModal
              products={itemLibrary}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'vendor-prices' && (
            <VendorPriceModal
              vendorPrices={vendorPrices}
              onRefresh={refreshData}
            />
          )}

          {(currentTab === 'admin-panel' || currentTab === 'settings' || currentTab === 'audit-logs') && (
            <AdminPanel
              settings={settings}
              onSettingsUpdated={(newSet) => setSettings(newSet)}
            />
          )}

        </main>
      </div>
    </div>
  );
};
