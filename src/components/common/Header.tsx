import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, LogOut, Shield, User as UserIcon, RefreshCw, Menu, X } from 'lucide-react';
import type { SystemSettings } from '../../types';

interface HeaderProps {
  settings?: SystemSettings | null;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ settings, isMobileMenuOpen, onToggleMobileMenu }) => {
  const { userProfile, logout, isAdmin } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Left Side: Mobile Menu Button & Brand Logo */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-lg sm:text-xl tracking-wider text-white shadow-lg shadow-blue-500/20 border border-blue-400/30 flex-shrink-0">
            Z
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                ZAJCO BOQ MAKER
              </span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-widest px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
                ERP v2.4
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden md:block truncate max-w-xs lg:max-w-sm">
              {settings?.companyName || 'ELV / ICT / MEP BOQ Management Platform'}
            </p>
          </div>
        </div>

        {/* Center - Exchange Rate & Settings Badge */}
        <div className="hidden lg:flex items-center space-x-4 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs flex-shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-400">EUR/SAR Rate:</span>
            <span className="font-bold text-emerald-400">1 EUR = {settings?.eurToSarRate || 5} SAR</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-300 font-medium">
            VAT: <span className="text-slate-200">{settings?.vatNumber || '300123456700003'}</span>
          </div>
        </div>

        {/* Right - Profile & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {userProfile && (
            <div className="flex items-center space-x-2 sm:space-x-3 bg-slate-800/60 pl-2 sm:pl-3 pr-1.5 sm:pr-2 py-1 rounded-xl border border-slate-700/50">
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center justify-end space-x-1">
                  <span className="truncate max-w-[120px] lg:max-w-[160px]">{userProfile.name}</span>
                  {isAdmin && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-end space-x-1">
                  <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
                  <span className="truncate max-w-[120px]">{userProfile.company || 'ZAJCO'}</span>
                </div>
              </div>

              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-600 flex-shrink-0">
                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
