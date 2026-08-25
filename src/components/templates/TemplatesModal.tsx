import React from 'react';
import { Bookmark, ArrowRight } from 'lucide-react';
import type { BOQTemplate } from '../../types';

interface TemplatesModalProps {
  templates: BOQTemplate[];
  onSelectTemplate: (template: BOQTemplate) => void;
  onClose?: () => void;
  conversionRate: number;
}

// Built-in standard ELV templates
const DEFAULT_PRESET_TEMPLATES: BOQTemplate[] = [
  {
    id: 'preset_nurse_call',
    name: 'Nurse Call System Standard Template',
    description: 'Complete Tunstall IP Nurse Call system layout including IP Com Stations, VOIP terminals, and head unit sockets.',
    system: 'Nurse Call',
    brand: 'Tunstall',
    createdBy: 'System Preset',
    createdAt: new Date().toISOString(),
    defaultItems: [
      { serialNumber: 1, description: 'Tunstall - 76060550 Com Station IP', quantity: 3, pricingSource: 'Discounted Listed Price', unitPriceEUR: 412.54, totalEUR: 1237.62, unitPriceSAR: 2062.70, totalSAR: 6188.10, profitPercentage: 40, percentageAdded: 825.08, unitPriceProfitIncl: 2887.78, totalProfitIncl: 8663.34 },
      { serialNumber: 2, description: 'Tunstall - Connection Terminal IP POE with VOIP', quantity: 12, pricingSource: 'Discounted Listed Price', unitPriceEUR: 185.00, totalEUR: 2220.00, unitPriceSAR: 925.00, totalSAR: 11100.00, profitPercentage: 35, percentageAdded: 323.75, unitPriceProfitIncl: 1248.75, totalProfitIncl: 14985.00 },
      { serialNumber: 3, description: 'Tunstall - Com Terminal IP POE', quantity: 24, pricingSource: 'Discounted Listed Price', unitPriceEUR: 160.00, totalEUR: 3840.00, unitPriceSAR: 800.00, totalSAR: 19200.00, profitPercentage: 35, percentageAdded: 280.00, unitPriceProfitIncl: 1080.00, totalProfitIncl: 25920.00 },
      { serialNumber: 4, description: 'Installation, Programming, Testing & Commissioning', quantity: 1, pricingSource: 'Management', unitPriceEUR: 0, totalEUR: 0, unitPriceSAR: 15000.00, totalSAR: 15000.00, isManualSAR: true, profitPercentage: 25, percentageAdded: 3750.00, unitPriceProfitIncl: 18750.00, totalProfitIncl: 18750.00 }
    ]
  },
  {
    id: 'preset_cctv',
    name: 'IP CCTV Surveillance System Template',
    description: 'Standard 4K IP Dome cameras, 32-Channel NVR, POE switches, and storage servers.',
    system: 'CCTV',
    brand: 'Honeywell / Hikvision',
    createdBy: 'System Preset',
    createdAt: new Date().toISOString(),
    defaultItems: [
      { serialNumber: 1, description: '4K IP Vandal Dome Camera 4MP 30m IR', quantity: 32, pricingSource: 'Discounted Listed Price', unitPriceEUR: 120.00, totalEUR: 3840.00, unitPriceSAR: 600.00, totalSAR: 19200.00, profitPercentage: 25, percentageAdded: 150.00, unitPriceProfitIncl: 750.00, totalProfitIncl: 24000.00 },
      { serialNumber: 2, description: '32-Channel NVR 4K 4-Bay SATA 32TB Storage', quantity: 2, pricingSource: 'Discounted Listed Price', unitPriceEUR: 850.00, totalEUR: 1700.00, unitPriceSAR: 4250.00, totalSAR: 8500.00, profitPercentage: 20, percentageAdded: 850.00, unitPriceProfitIncl: 5100.00, totalProfitIncl: 10200.00 },
      { serialNumber: 3, description: 'Cisco 24-Port Gigabit POE Switch', quantity: 2, pricingSource: 'Vendor Quotation', unitPriceEUR: 0, totalEUR: 0, unitPriceSAR: 3800.00, totalSAR: 7600.00, isManualSAR: true, profitPercentage: 15, percentageAdded: 570.00, unitPriceProfitIncl: 4370.00, totalProfitIncl: 8740.00 }
    ]
  },
  {
    id: 'preset_access_control',
    name: 'Access Control & RFID Door Controller Template',
    description: '2-Door Network Controller, RFID Card Readers, Magnetic Locks, Emergency Breakglass.',
    system: 'Access Control',
    brand: 'HID / Suprema',
    createdBy: 'System Preset',
    createdAt: new Date().toISOString(),
    defaultItems: [
      { serialNumber: 1, description: 'HID iCLASS SE Smart Card Reader', quantity: 16, pricingSource: 'Discounted Listed Price', unitPriceEUR: 95.00, totalEUR: 1520.00, unitPriceSAR: 475.00, totalSAR: 7600.00, profitPercentage: 30, percentageAdded: 142.50, unitPriceProfitIncl: 617.50, totalProfitIncl: 9880.00 },
      { serialNumber: 2, description: '2-Door IP Controller Board with Enclosure', quantity: 8, pricingSource: 'Discounted Listed Price', unitPriceEUR: 320.00, totalEUR: 2560.00, unitPriceSAR: 1600.00, totalSAR: 12800.00, profitPercentage: 25, percentageAdded: 400.00, unitPriceProfitIncl: 2000.00, totalProfitIncl: 16000.00 }
    ]
  }
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  templates,
  onSelectTemplate,
  onClose
}) => {
  const allTemplates = [...DEFAULT_PRESET_TEMPLATES, ...templates];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <span>Standard System BOQ Templates</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a pre-configured template to instantly populate project metadata and line items
          </p>
        </div>

        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold">
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allTemplates.map(tmpl => (
          <div
            key={tmpl.id}
            className="bg-slate-950 border border-slate-800 hover:border-blue-500/60 p-5 rounded-2xl flex flex-col justify-between space-y-4 group transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                  {tmpl.system}
                </span>
                <span className="text-[10px] text-slate-500">{tmpl.defaultItems.length} Items</span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                {tmpl.name}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                {tmpl.description}
              </p>
            </div>

            <button
              onClick={() => onSelectTemplate(tmpl)}
              className="w-full flex items-center justify-center space-x-1.5 py-2 bg-slate-800 group-hover:bg-blue-600 text-slate-200 group-hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              <span>Use This Template</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
