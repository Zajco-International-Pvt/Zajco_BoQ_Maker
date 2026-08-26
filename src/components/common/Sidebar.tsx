import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileSpreadsheet, 
  FileUp, 
  BookmarkCheck, 
  PackageSearch, 
  Tag, 
  ShieldAlert, 
  Settings, 
  History,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavTab = 
  | 'dashboard'
  | 'create-boq'
  | 'boqs-list'
  | 'excel-import'
  | 'templates'
  | 'item-library'
  | 'vendor-prices'
  | 'admin-panel'
  | 'audit-logs'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen = false, onClose }) => {
  const { isAdmin } = useAuth();

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<any>; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-boq', label: 'Create New BOQ', icon: PlusCircle },
    { id: 'boqs-list', label: 'All BOQs', icon: FileSpreadsheet },
    { id: 'excel-import', label: 'Import Excel', icon: FileUp },
    { id: 'templates', label: 'BOQ Templates', icon: BookmarkCheck },
    { id: 'item-library', label: 'Product Catalog', icon: PackageSearch },
    { id: 'vendor-prices', label: 'Vendor Prices', icon: Tag },
    { id: 'admin-panel', label: 'Admin Panel', icon: ShieldAlert, adminOnly: true },
    { id: 'audit-logs', label: 'Audit Logs', icon: History, adminOnly: true },
    { id: 'settings', label: 'System Settings', icon: Settings, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } min-h-[calc(100vh-4rem)] overflow-y-auto`}
      >
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Navigation Menu</span>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;

            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                    : 'hover:bg-slate-800 hover:text-slate-100 text-slate-400'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>System Online & Connected</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Firebase Live Sync Enabled
          </div>
        </div>
      </aside>
    </>
  );
};
