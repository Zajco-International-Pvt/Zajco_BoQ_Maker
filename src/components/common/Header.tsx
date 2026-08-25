import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, LogOut, Shield, User as UserIcon, RefreshCw } from 'lucide-react';
import type { SystemSettings } from '../../types';

interface HeaderProps {
  settings?: SystemSettings | null;
}

export const Header: React.FC<HeaderProps> = ({ settings }) => {
  const { userProfile, logout, isAdmin } = useAuth();

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-xl tracking-wider text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            Z
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                ZAJCO BOQ MAKER
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ERP v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              {settings?.companyName || 'ELV / ICT / MEP BOQ Management Platform'}
            </p>
          </div>
        </div>

        {/* Center - Exchange Rate & Settings Badge */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
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
        <div className="flex items-center space-x-3">
          {userProfile && (
            <div className="flex items-center space-x-3 bg-slate-800/60 pl-3 pr-2 py-1 rounded-xl border border-slate-700/50">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-100 flex items-center justify-end space-x-1">
                  <span>{userProfile.name}</span>
                  {isAdmin && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Shield className="w-3 h-3 mr-0.5" />
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-end space-x-1">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span>{userProfile.company || 'ZAJCO'}</span>
                </div>
              </div>

              <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-600">
                <UserIcon className="w-5 h-5 text-blue-400" />
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
