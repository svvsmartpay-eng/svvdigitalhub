import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Check, Play, FileText, Camera, ShieldCheck, Printer, Copy, Layers, Sparkles } from 'lucide-react';

export interface ServiceTemplate {
  service_type: string;
  service_name: string;
  price: number;
  icon?: any;
}

export const STANDARD_SERVICES: ServiceTemplate[] = [
  { service_type: 'PAN_CARD', service_name: 'PAN Card Application', price: 150 },
  { service_type: 'PHOTO_PRINT', service_name: 'Photo Print (4 Copies)', price: 50 },
  { service_type: 'LAMINATION', service_name: 'Lamination', price: 30 },
  { service_type: 'PVC_PRINT', service_name: 'PVC Plastic Card Print (CR80)', price: 100 },
  { service_type: 'COLOR_PRINT', service_name: 'Color Document Print', price: 20 },
  { service_type: 'BW_XEROX', service_name: 'B&W Xerox / Copy', price: 5 },
  { service_type: 'AADHAAR_UPDATE', service_name: 'Aadhaar / Online Service Registration', price: 100 },
];

interface ServiceSelectionModalProps {
  open: boolean;
  onClose: () => void;
  ticketNo: string;
  customerName: string;
  initialIntent?: 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH';
  onStartWork: (
    selectedServices: Array<{ service_type: string; service_name: string; price: number; requires_print_confirmation?: boolean }>,
    customerIntent: 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH'
  ) => void;
  isSubmitting?: boolean;
}

export default function ServiceSelectionModal({
  open,
  onClose,
  ticketNo,
  customerName,
  initialIntent = 'PRINT_ONLY',
  onStartWork,
  isSubmitting = false,
}: ServiceSelectionModalProps) {
  const [customerIntent, setCustomerIntent] = useState<'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH'>(initialIntent);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
    PAN_CARD: initialIntent === 'ONLINE_SERVICE_ONLY' || initialIntent === 'BOTH',
    PVC_PRINT: initialIntent === 'PRINT_ONLY',
  });
  const [customServices, setCustomServices] = useState<Array<{ service_type: string; service_name: string; price: number; requires_print_confirmation?: boolean }>>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('50');

  if (!open) return null;

  const handleIntentChange = (intent: 'PRINT_ONLY' | 'ONLINE_SERVICE_ONLY' | 'BOTH') => {
    setCustomerIntent(intent);
    if (intent === 'PRINT_ONLY') {
      setSelectedTypes({ PVC_PRINT: true });
    } else if (intent === 'ONLINE_SERVICE_ONLY') {
      setSelectedTypes({ PAN_CARD: true });
    } else {
      setSelectedTypes({ PAN_CARD: true, PVC_PRINT: true });
    }
  };

  const toggleService = (type: string) => {
    setSelectedTypes(prev => {
      const next = { ...prev, [type]: !prev[type] };
      // Auto-update intent based on selected items
      const selectedKeys = Object.keys(next).filter(k => next[k]);
      const hasPrint = selectedKeys.some(k => ['PHOTO_PRINT', 'LAMINATION', 'PVC_PRINT', 'COLOR_PRINT', 'BW_XEROX'].includes(k));
      const hasOnline = selectedKeys.some(k => ['PAN_CARD', 'AADHAAR_UPDATE'].includes(k));

      if (hasPrint && hasOnline) {
        setCustomerIntent('BOTH');
      } else if (hasOnline) {
        setCustomerIntent('ONLINE_SERVICE_ONLY');
      } else {
        setCustomerIntent('PRINT_ONLY');
      }
      return next;
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const customType = `CUSTOM_${Date.now()}`;
    const newSvc = {
      service_type: customType,
      service_name: newServiceName.trim(),
      price: Number(newServicePrice) || 50,
      requires_print_confirmation: false,
    };
    setCustomServices(prev => [...prev, newSvc]);
    setSelectedTypes(prev => ({ ...prev, [customType]: true }));
    setNewServiceName('');
    setShowCustomInput(false);
  };

  const handleSubmit = () => {
    const servicesToStart: Array<{ service_type: string; service_name: string; price: number; requires_print_confirmation?: boolean }> = [];

    STANDARD_SERVICES.forEach(s => {
      if (selectedTypes[s.service_type]) {
        const isPrint = ['PHOTO_PRINT', 'LAMINATION', 'PVC_PRINT', 'COLOR_PRINT', 'BW_XEROX'].includes(s.service_type);
        servicesToStart.push({
          service_type: s.service_type,
          service_name: s.service_name,
          price: s.price,
          requires_print_confirmation: isPrint,
        });
      }
    });

    customServices.forEach(cs => {
      if (selectedTypes[cs.service_type]) {
        servicesToStart.push(cs);
      }
    });

    if (servicesToStart.length === 0) {
      alert('Please select at least one service to start work.');
      return;
    }

    onStartWork(servicesToStart, customerIntent);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#081B3A] p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0D6EFD] text-white flex items-center justify-center font-bold">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Step 3: Start Work</h2>
              <p className="text-xs text-[#CBD5E1]">
                Ticket <span className="font-mono font-bold text-[#86EFAC]">{ticketNo}</span> • {customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Customer Intent Selector */}
          <div>
            <label className="text-xs font-bold text-[#081B3A] uppercase tracking-wider block mb-1.5">
              Customer Intent (Work Direction)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleIntentChange('PRINT_ONLY')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  customerIntent === 'PRINT_ONLY'
                    ? 'bg-[#E7F1FF] border-[#0D6EFD] text-[#0D6EFD] shadow-xs ring-2 ring-[#0D6EFD]/20'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Print Only</span>
              </button>

              <button
                type="button"
                onClick={() => handleIntentChange('ONLINE_SERVICE_ONLY')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  customerIntent === 'ONLINE_SERVICE_ONLY'
                    ? 'bg-[#F0FDF4] border-[#16A34A] text-[#16A34A] shadow-xs ring-2 ring-[#16A34A]/20'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>🌐 Online Service</span>
              </button>

              <button
                type="button"
                onClick={() => handleIntentChange('BOTH')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  customerIntent === 'BOTH'
                    ? 'bg-[#FAF5FF] border-[#9333EA] text-[#9333EA] shadow-xs ring-2 ring-[#9333EA]/20'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>🔄 Both (Svc + Print)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#081B3A] uppercase tracking-wider block mb-1.5">
              Select Output Jobs for this Ticket
            </label>
            <p className="text-xs text-[#64748B]">
              Choose the service types to perform. You can also add more services at any time before closing.
            </p>
          </div>

          <div className="space-y-2">
            {STANDARD_SERVICES.map((s) => {
              const isChecked = Boolean(selectedTypes[s.service_type]);
              return (
                <div
                  key={s.service_type}
                  onClick={() => toggleService(s.service_type)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? 'bg-[#F0FDF4] border-[#198754] text-[#081B3A] shadow-2xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-white hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#198754] border-[#198754] text-white'
                          : 'bg-white border-[#CBD5E1]'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold block">{s.service_name}</span>
                      <span className="text-[11px] text-[#64748B] font-mono">₹{s.price} standard rate</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom Services Added */}
            {customServices.map((cs) => {
              const isChecked = Boolean(selectedTypes[cs.service_type]);
              return (
                <div
                  key={cs.service_type}
                  onClick={() => toggleService(cs.service_type)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isChecked
                      ? 'bg-[#F0FDF4] border-[#198754] text-[#081B3A] shadow-2xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#198754] border-[#198754] text-white'
                          : 'bg-white border-[#CBD5E1]'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="text-sm font-bold block">{cs.service_name}</span>
                      <span className="text-[11px] text-[#64748B] font-mono">₹{cs.price} (Custom Service)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Custom Service Button / Inline Form */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[#0D6EFD] text-[#0D6EFD] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> + Add Another Service
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="p-3 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1] space-y-2.5">
              <span className="text-xs font-bold text-[#081B3A] block">Add Custom Service</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Service Name (e.g. Spiral Binding)"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#081B3A] focus:outline-none focus:ring-1 focus:ring-[#0D6EFD]"
                  autoFocus
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="w-20 bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#081B3A] focus:outline-none focus:ring-1 focus:ring-[#0D6EFD]"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomInput(false)}
                  className="h-7 text-xs border-[#CBD5E1]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs bg-[#0D6EFD] text-white font-bold"
                >
                  Add
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-[#CBD5E1] text-xs font-medium cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isSubmitting}
            className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white text-xs font-bold px-5 cursor-pointer shadow-xs"
          >
            <Play className="w-3.5 h-3.5 mr-1" /> Start Work
          </Button>
        </div>
      </div>
    </div>
  );
}
