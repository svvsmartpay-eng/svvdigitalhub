/**
 * GlobalWhatsAppStatus — SVV AMS Header Badge
 *
 * Shows real-time WhatsApp connection status for the active branch.
 * - 🟢 LIVE (green) = Supabase sessionStatus CONNECTED AND phone number exists
 * - 🔴 OFFLINE (amber pulsing) = Not linked or disconnected
 *
 * Zero hardcoded phone numbers. Only reads from Supabase & localStorage.
 */

import React, { useState, useEffect } from 'react';
import { useBranchWhatsAppConfigs } from '@/api/printHub.api';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import { QrCode } from 'lucide-react';
import { useFilterStore } from '@/stores/filter.store';
import { useQueryClient } from '@tanstack/react-query';

export default function GlobalWhatsAppStatus() {
  const { data: configs, refetch } = useBranchWhatsAppConfigs();
  const [showModal, setShowModal] = useState(false);
  const selectedBranchId = useFilterStore((s) => s.selectedBranches?.[0]);
  const qc = useQueryClient();

  const [liveBranch, setLiveBranch] = useState<any>(null);

  const syncLiveBranch = () => {
    try {
      const local = localStorage.getItem('svv_branches_store');
      if (local) {
        const list = JSON.parse(local);
        const match = (selectedBranchId && selectedBranchId !== 'ALL')
          ? list.find((b: any) => b.id === selectedBranchId)
          : list[0];
        setLiveBranch(match || list[0] || null);
        return;
      }
    } catch {}
    setLiveBranch((configs || [])[0] || null);
  };

  useEffect(() => {
    syncLiveBranch();
    window.addEventListener('storage', syncLiveBranch);
    return () => window.removeEventListener('storage', syncLiveBranch);
  }, [selectedBranchId, configs]);

  const activeConfig = liveBranch || (configs || [])[0] || null;

  // Only show CONNECTED if real session exists — no fake status
  const phone = activeConfig?.whatsappNumber || activeConfig?.phone || null;
  const isConnected = activeConfig?.sessionStatus === 'CONNECTED' && !!phone;
  const branchId = activeConfig?.id || activeConfig?.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c';

  const handleClose = () => {
    setShowModal(false);
    syncLiveBranch();
    refetch();
    qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
  };

  return (
    <>
      <div className="flex items-center">
        {isConnected ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title={`WhatsApp LIVE on ${phone}. Click to manage session.`}
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
