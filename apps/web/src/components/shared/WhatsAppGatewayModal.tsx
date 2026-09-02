import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, LogOut, AlertTriangle, MessageSquare, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { useStartWhatsAppGateway, useWhatsAppGatewayStatus, useDisconnectWhatsAppGateway } from '@/api/printHub.api';

interface WhatsAppGatewayModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  onOrderCreated?: () => void;
}

export default function WhatsAppGatewayModal({
  open,
  onClose,
  branchId = 'f5abaacc-d2b6-4591-91fb-314b2188e18c',
  onOrderCreated,
}: WhatsAppGatewayModalProps) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const role: string = (user as any)?.primaryRole || (user as any)?.role || 'STAFF';
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'BRANCH_MANAGER';

  const { mutate: startGateway } = useStartWhatsAppGateway();
  const { mutate: disconnectGateway, isPending: disconnecting } = useDisconnectWhatsAppGateway();
  const { data: sessionStatus, refetch } = useWhatsAppGatewayStatus(branchId, open);

  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (open && canManage && branchId) {
      startGateway(branchId);
    }
  }, [open, branchId, canManage]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      refetch();
    }, 3000);
    return () => clearInterval(timer);
  }, [open, refetch]);

  useEffect(() => {
    if (sessionStatus?.status === 'CONNECTED') {
      setLastSync(new Date().toISOString());
      qc.invalidateQueries({ queryKey: ['branch-whatsapp-configs'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
      if (onOrderCreated) onOrderCreated();
    }
  }, [sessionStatus?.status, qc, onOrderCreated]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#111b21] text-[#e9edef] rounded-3xl shadow-2xl border border-[#222e35] w-full max-w-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-[#202c33] px-6 py-4 flex items-center justify-between border-b border-[#222e35]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-md">
              <MessageSquare className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">Shop WhatsApp</span>
                {sessionStatus?.status === 'CONNECTED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
                {sessionStatus?.status === 'SCAN_QR_REQUIRED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300 border border-amber-600/30">
                    PENDING SCAN
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8696a0] mt-0.5">
                {sessionStatus?.status === 'CONNECTED'
                  ? `Connected via WhatsApp Web Gateway`
                  : 'Scan real WhatsApp Web QR code to link'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-2 rounded-full cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {(!sessionStatus || sessionStatus.status === 'CONNECTING' || sessionStatus.status === 'LOADING') && (
            <div className="py-10 text-center text-[#8696a0] text-sm animate-pulse">
              Connecting to WhatsApp Gateway...
            </div>
          )}

          {sessionStatus?.status === 'CONNECTED' && (
            <div className="bg-[#202c33] rounded-2xl p-6 border border-[#00a884]/40 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#00a884]/20 border-2 border-[#00a884] flex items-center justify-center text-[#00a884] mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">WhatsApp is Live!</h3>
                <p className="text-xs text-[#8696a0] mt-1">
                  Active Number: <strong className="text-emerald-400 font-mono text-sm">{sessionStatus.connectedPhone || 'Unknown'}</strong>
                </p>
                {lastSync && (
                  <p className="text-[11px] text-[#8696a0] mt-0.5">
                    Session Synced: {new Date(lastSync).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="pt-2 max-w-xs mx-auto">
                  <Button
                    onClick={() => disconnectGateway(branchId)}
                    disabled={disconnecting}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs rounded-xl cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" /> Disconnect Session
                  </Button>
                </div>
              )}
            </div>
          )}

          {sessionStatus?.status === 'SCAN_QR_REQUIRED' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Instructions */}
              <div className="md:col-span-6 space-y-4">
                <h2 className="text-base font-bold text-white">Link Device via WhatsApp Web</h2>
                <ol className="space-y-3 text-xs text-[#d1d7db]">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>Open <strong>WhatsApp Business</strong> on your shop phone</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Tap <strong>Menu ⋮</strong> (Android) or <strong>Settings ⚙</strong> (iPhone)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Tap <strong>Linked Devices → Link a Device</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                    <span>Point your camera to the QR code on the right</span>
                  </li>
                </ol>
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl text-blue-200 text-xs">
                  The system will automatically detect the connection and save your phone number.
                </div>
              </div>

              {/* Real Baileys QR Code */}
              <div className="md:col-span-6 flex flex-col items-center justify-center">
                <div className="bg-white p-4 rounded-3xl shadow-xl border-4 border-[#222e35] relative">
                  {sessionStatus.qrCodeDataUrl ? (
                    <img src={sessionStatus.qrCodeDataUrl} alt="WhatsApp Web QR" className="w-[220px] h-[220px]" />
                  ) : (
                    <div className="w-[220px] h-[220px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400 text-xs">
                      Fetching QR...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!canManage && (
            <div className="py-10 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">Access Denied</p>
              <p className="text-xs text-[#8696a0]">Only Admin or Managers can link WhatsApp sessions.</p>
            </div>
          )}

          {canManage && sessionStatus?.status === 'DISCONNECTED' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">WhatsApp Gateway Engine Offline</p>
                <p className="text-xs text-[#8696a0] mt-2 max-w-sm mx-auto">
                  The Baileys WhatsApp backend is not reachable. If you are on Vercel, ensure your backend server (apps/api) is running locally on port 4000 or deployed, and is accessible.
                </p>
              </div>
              <Button
                onClick={() => startGateway(branchId)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-2 rounded-xl mt-4"
              >
                Retry Connection
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#202c33] px-6 py-3 border-t border-[#222e35] flex items-center justify-between text-xs text-[#8696a0]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            <span>End-to-end encrypted session</span>
          </div>
          <button onClick={onClose} className="text-xs text-[#d1d7db] hover:text-white font-bold cursor-pointer">
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
