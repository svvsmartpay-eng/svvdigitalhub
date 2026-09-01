import React, { useState } from 'react';
import { useBranchWhatsAppConfigs } from '@/api/printHub.api';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import { Smartphone, CheckCircle2, Radio, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalWhatsAppStatus() {
  const { data: configs, refetch } = useBranchWhatsAppConfigs();
  const [showModal, setShowModal] = useState(false);

  const activeConfig = (configs || [])[0] || null;
  const isConnected = activeConfig?.status === 'ACTIVE' || activeConfig?.status === 'CONNECTED';
  const phone = activeConfig?.whatsappNumber || activeConfig?.phoneNumber || '+91 77386 63866';

  return (
    <>
      <div className="flex items-center">
        {isConnected ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="WhatsApp Line Connected. Click to view session or disconnect."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-[11px] hidden sm:inline">{phone}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.2 rounded">Live</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs animate-pulse"
            title="WhatsApp Line Disconnected. Click to scan QR code and connect."
          >
            <Radio className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] hidden sm:inline">WhatsApp Offline</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">Connect</span>
          </button>
        )}
      </div>

      {showModal && (
        <WhatsAppGatewayModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            refetch();
          }}
          branchId={activeConfig?.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c'}
          onOrderCreated={refetch}
        />
      )}
    </>
  );
}
