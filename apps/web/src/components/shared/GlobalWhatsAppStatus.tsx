import React, { useState, useEffect } from 'react';
import { useBranchWhatsAppConfigs } from '@/api/printHub.api';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import { Radio } from 'lucide-react';
import { useFilterStore } from '@/stores/filter.store';

export default function GlobalWhatsAppStatus() {
  const { data: configs, refetch } = useBranchWhatsAppConfigs();
  const [showModal, setShowModal] = useState(false);
  const selectedBranchId = useFilterStore((s) => s.selectedBranches?.[0]);

  // Read live branches from local store directly to avoid stale cache
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
  const isConnected = activeConfig?.sessionStatus === 'CONNECTED';
  const phone = activeConfig?.whatsappNumber || activeConfig?.phone || '+91 6305210926';
  const branchId = activeConfig?.id || activeConfig?.branchId || 'f5abaacc-d2b6-4591-91fb-314b2188e18c';

  return (
    <>
      <div className="flex items-center">
        {isConnected ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title={`WhatsApp Line Connected for ${phone}. Click to manage session.`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-[11px] hidden sm:inline">{phone}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-200/60 px-1.5 py-0.2 rounded">Live</span>
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs animate-pulse"
            title={`WhatsApp Line Offline for ${phone}. Click to scan QR code and connect.`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-mono hidden sm:inline">{phone}</span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">Connect</span>
          </button>
        )}
      </div>

      {showModal && (
        <WhatsAppGatewayModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            syncLiveBranch();
            refetch();
          }}
          branchId={branchId}
          onOrderCreated={() => {
            syncLiveBranch();
            refetch();
          }}
        />
      )}
    </>
  );
}
