/**
 * GlobalWhatsAppStatus — SVV AMS Header Badge
 *
 * SINGLE SOURCE OF TRUTH: reads exclusively from useBranchWhatsAppConfigs()
 * which queries Supabase branch_whatsapp_configs as the authoritative source.
 *
 * 🟢 CONNECTED = status === 'CONNECTED' AND whatsappNumber is non-null
 * 🔴 OFFLINE   = anything else
 *
 * Zero hardcoded phone numbers. Zero localStorage-only reads for status.
 */

import React, { useState } from 'react';
import { useBranchWhatsAppConfigs } from '@/api/printHub.api';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import { useFilterStore } from '@/stores/filter.store';
import { useQueryClient } from '@tanstack/react-query';

export default function GlobalWhatsAppStatus() {
  const { data: configs, refetch } = useBranchWhatsAppConfigs();
  const [showModal, setShowModal] = useState(false);
  const selectedBranchId = useFilterStore((s) => s.selectedBranches?.[0]);
  const qc = useQueryClient();

  // Find the active branch config from Supabase-sourced data
  const activeConfig = selectedBranchId && selectedBranchId !== 'ALL'
    ? (configs || []).find((c: any) => c.branchId === selectedBranchId) || (configs || [])[0]
    : (configs || [])[0];

  // CONNECTED = real status from Supabase AND real phone number exists
  const isConnected = activeConfig?.status === 'CONNECTED' && !!activeConfig?.whatsappNumber;
  const phone: string = activeConfig?.whatsappNumber || '';
  const branchId: string = activeConfig?.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c';

  const handleClose = () => {
    setShowModal(false);
    refetch();
    qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
    qc.invalidateQueries({ queryKey: ['whatsapp-gateway-status', branchId] });
  };

  return (
    <>
      <div className="flex items-center">
        {isConnected ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title={`WhatsApp LIVE on ${phone}. Click to manage.`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-[11px] hidden sm:inline">{phone}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.5 rounded">Live</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="WhatsApp not linked. Click to scan QR and connect."
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[11px] hidden sm:inline">WhatsApp Offline</span>
            <span className="text-[10px] font-bold text-red-800 bg-red-200/70 px-1.5 py-0.5 rounded">Scan QR</span>
          </button>
        )}
      </div>

      {showModal && (
        <WhatsAppGatewayModal
          open={showModal}
          onClose={handleClose}
          branchId={branchId}
          onOrderCreated={handleClose}
        />
      )}
    </>
  );
}
