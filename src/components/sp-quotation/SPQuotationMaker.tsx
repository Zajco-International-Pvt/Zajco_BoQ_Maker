import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  ShieldAlert, 
  FileCheck2,
  Layers
} from 'lucide-react';

export const SPQuotationMaker: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Set admin session keys so standalone HTML and new window verify authorization
  useEffect(() => {
    if (isAdmin) {
      sessionStorage.setItem('zajco_admin_access', 'true');
      localStorage.setItem('zajco_admin_session', 'true');
    }
  }, [isAdmin]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The Supporting Quotation Maker is a standalone module reserved exclusively for ZAJCO system administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenNewTab = () => {
    sessionStorage.setItem('zajco_admin_access', 'true');
    localStorage.setItem('zajco_admin_session', 'true');
    window.open('/sp-quotation-maker.html?access=admin', '_blank');
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`transition-all duration-200 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 bg-slate-950 p-2 sm:p-4 flex flex-col' 
        : 'flex flex-col space-y-3 w-full'
    }`}>
      {/* Top Controls Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-600/20 flex-shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Supporting Quotation Maker
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                Admin Exclusive
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-3 h-3 mr-0.5" />
                Standalone Module
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 hidden xs:block">
              Arabian Alligator, Qamra, Sundial &amp; SP Payment formats &bull; Direct Excel &amp; PDF Export
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReload}
            title="Reload Quotation Maker Module"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reload</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenNewTab}
            title="Open Standalone Module in New Browser Tab"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Tab</span>
          </button>
        </div>
      </div>

      {/* Embedded Standalone Frame Container */}
      <div 
        className={`relative w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'flex-1 h-full' 
            : 'h-[calc(100vh-13rem)] min-h-[750px]'
        }`}
      >
        {/* Loading overlay spinner */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3 text-slate-300">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-400">Loading Supporting Quotation Maker...</span>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src="/sp-quotation-maker.html?access=admin"
          title="Supporting Quotation Maker Standalone Module"
          className="w-full h-full border-0 bg-white"
          allow="clipboard-read; clipboard-write; fullscreen"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};
