import React, { useState } from 'react';
import {
  useBranchWhatsAppConfigs,
  useUpsertBranchWhatsAppConfig,
  useTestWhatsAppConnection,
  useStartWhatsAppGateway,
  useWhatsAppGatewayStatus,
  useDisconnectWhatsAppGateway
} from '@/api/printHub.api';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  QrCode, Printer, Download, MessageSquare,
  Building2, Sparkles, Phone, CheckCircle2,
  Settings, Edit3, Send, ShieldCheck, Power,
  Check, AlertCircle, RefreshCw, Smartphone,
  Radio, X, ExternalLink
} from 'lucide-react';

export default function BranchQRCodesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.primaryRole === 'SUPER_ADMIN' || user?.primaryRole === 'ADMIN';

  const { data: branchConfigs, isLoading, refetch } = useBranchWhatsAppConfigs();
  const upsertMutation = useUpsertBranchWhatsAppConfig();
  const testPingMutation = useTestWhatsAppConnection();
  const startGatewayMutation = useStartWhatsAppGateway();
  const disconnectGatewayMutation = useDisconnectWhatsAppGateway();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Live WhatsApp Web Pairing Modal State
  const [pairingBranch, setPairingBranch] = useState<any | null>(null);
  const { data: gatewayStatus } = useWhatsAppGatewayStatus(pairingBranch?.branchId, Boolean(pairingBranch));

  // Edit / Activation Modal State
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [welcomeMsgInput, setWelcomeMsgInput] = useState('');
  const [statusInput, setStatusInput] = useState('ACTIVE');
  const [autoPrintInput, setAutoPrintInput] = useState(false);
  const [notifyReadyInput, setNotifyReadyInput] = useState(true);

  // Test Ping Modal
  const [testBranch, setTestBranch] = useState<any | null>(null);
  const [testPhone, setTestPhone] = useState('+91 98765 43210');
  const [testResult, setTestResult] = useState<string | null>(null);

  const activeBranch = (branchConfigs || []).find((b: any) => b.branchId === selectedBranchId) || branchConfigs?.[0];

  const whatsappNumber = activeBranch?.whatsappNumber || '+91 98480 12345';
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const qrLink = `https://wa.me/${cleanNumber}?text=Hi%20SVV%20${encodeURIComponent(activeBranch?.branchName || 'Branch')}%20Print%20Desk,%20I%20want%20to%20print%20a%20document`;

  const handleOpenPairingModal = (b: any) => {
    setPairingBranch(b);
    startGatewayMutation.mutate(b.branchId);
  };

  const handleOpenEditModal = (b: any) => {
    setEditingBranch(b);
    setPhoneInput(b.whatsappNumber || '+91 ');
    setDisplayNameInput(b.displayName || `${b.branchName} Print Desk`);
    setWelcomeMsgInput(b.welcomeMessage || `Welcome to SVV ${b.branchName} Print Desk! Send your PDF/Word document here to print.`);
    setStatusInput(b.status || 'ACTIVE');
    setAutoPrintInput(b.autoPrint || false);
    setNotifyReadyInput(b.notifyOnReady ?? true);
  };

  const handleSaveActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    upsertMutation.mutate(
      {
        branchId: editingBranch.branchId,
        data: {
          whatsappNumber: phoneInput,
          displayName: displayNameInput,
          welcomeMessage: welcomeMsgInput,
          status: statusInput,
          autoPrint: autoPrintInput,
          notifyOnReady: notifyReadyInput,
        },
      },
      {
        onSuccess: () => {
          setEditingBranch(null);
          refetch();
        },
      }
    );
  };

  const handleSendTestPing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testBranch) return;

    testPingMutation.mutate(
      {
        branchId: testBranch.branchId,
        testPhone,
      },
      {
        onSuccess: (res: any) => {
          setTestResult(res?.message || 'Test message sent successfully!');
        },
        onError: (err: any) => {
          setTestResult(`Error: ${err?.response?.data?.error || err.message}`);
        },
      }
    );
  };

  const handlePrintFlyer = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-[#1e3a5f]" /> Branch WhatsApp Multi-Device Gateway & QR Standees
          </h2>
          <p className="text-[11px] text-gray-500">Scan WhatsApp Web QR code to connect your real branch phone numbers directly without Meta approvals</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs h-8 text-gray-600 bg-white border-gray-300 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={handlePrintFlyer}
            className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-8"
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Counter Standee
          </Button>
        </div>
      </div>

      {/* ── 1. Branch WhatsApp Connection & Device Link Matrix ─────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">Branch WhatsApp Phone Link (Option 2: WhatsApp Web Engine)</h3>
              <p className="text-[10px] text-gray-500">Open WhatsApp on your branch phone → Tap 'Linked Devices' → Scan QR on screen to connect live</p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            Multi-Device Active
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center"><LoadingSpinner size="md" /></div>
        ) : (branchConfigs || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">No active branches found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-3.5 py-3">Branch</th>
                  <th className="px-3.5 py-3">Connected Mobile Number</th>
                  <th className="px-3.5 py-3">Bot Name</th>
                  <th className="px-3.5 py-3">Live Phone Link Status</th>
                  <th className="px-3.5 py-3 text-right">Device Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {(branchConfigs || []).map((cfg: any) => (
                  <tr
                    key={cfg.branchId}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      activeBranch?.branchId === cfg.branchId ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="font-bold text-gray-900 block">{cfg.branchName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Code: {cfg.branchCode} · {cfg.branchCity}</span>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{cfg.whatsappNumber}</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap text-gray-700 font-medium">
                      {cfg.displayName}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {cfg.status === 'ACTIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Connected & Online
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 w-fit flex items-center gap-1">
                          <Radio className="w-3 h-3 text-amber-600" /> Pairing Required
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPairingModal(cfg)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 font-bold shadow-2xs"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1" /> Scan WhatsApp Web QR
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBranchId(cfg.branchId)}
                          className={`text-xs h-7 px-2.5 ${
                            activeBranch?.branchId === cfg.branchId
                              ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                              : 'text-gray-700'
                          }`}
                        >
                          <Printer className="w-3 h-3 mr-1" /> View Poster
                        </Button>

                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditModal(cfg)}
                            className="text-xs h-7 px-2 text-gray-500 hover:text-gray-900"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. Live WhatsApp Web QR Pairing Modal ──────────────────────────────── */}
      {pairingBranch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-sans text-center">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <Smartphone className="w-4 h-4" /> Link Branch WhatsApp ({pairingBranch.branchName})
              </div>
              <button onClick={() => setPairingBranch(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            {/* Instruction Steps */}
            <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 text-left space-y-1.5 text-xs text-emerald-950">
              <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> How to Link (10 Seconds):
              </h4>
              <ol className="text-[11px] pl-4 list-decimal space-y-1 opacity-90 leading-tight">
                <li>Open <strong>WhatsApp</strong> on your branch phone.</li>
                <li>Tap <strong>⋮ Menu (or Settings) → Linked Devices</strong>.</li>
                <li>Tap <strong>"Link a Device"</strong> and scan the QR code below.</li>
              </ol>
            </div>

            {/* Live Baileys QR Code Display */}
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-emerald-400 inline-block mx-auto">
              {gatewayStatus?.status === 'CONNECTED' ? (
                <div className="py-8 px-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900">Branch Phone Linked!</h3>
                  <p className="text-xs text-emerald-800 font-mono font-bold">
                    {gatewayStatus.connectedPhone || pairingBranch.whatsappNumber}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Live connection active 24/7. All incoming customer documents will automatically appear on the Print Desk!
                  </p>
                </div>
              ) : gatewayStatus?.qrCodeDataUrl ? (
                <div className="space-y-2">
                  <img
                    src={gatewayStatus.qrCodeDataUrl}
                    alt="WhatsApp Web QR Code"
                    className="w-56 h-56 mx-auto rounded-lg shadow-xs"
                  />
                  <span className="text-[10px] text-gray-400 font-mono block animate-pulse">
                    ● Scan with WhatsApp camera on branch phone...
                  </span>
                </div>
              ) : (
                <div className="py-16 px-12 space-y-3 text-center">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-gray-500 font-medium">Generating live WhatsApp Web session...</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs">
              {gatewayStatus?.status === 'CONNECTED' ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    disconnectGatewayMutation.mutate(pairingBranch.branchId);
                  }}
                  className="text-xs font-semibold h-8"
                >
                  <Power className="w-3.5 h-3.5 mr-1" /> Disconnect Device
                </Button>
              ) : (
                <span className="text-[11px] text-gray-400">Waiting for scan...</span>
              )}

              <Button
                size="sm"
                onClick={() => {
                  setPairingBranch(null);
                  refetch();
                }}
                className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-bold px-4 h-8"
              >
                {gatewayStatus?.status === 'CONNECTED' ? 'Done & Close' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Live Printable Standee Preview ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 cols: Standee Details */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-[#1e3a5f]" /> Standee Poster Details
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Select Branch Poster</label>
              <select
                value={activeBranch?.branchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
              >
                {(branchConfigs || []).map((b: any) => (
                  <option key={b.branchId} value={b.branchId}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <span className="text-gray-400 text-[10px] uppercase font-bold">Target Connected Number</span>
              <p className="font-mono font-bold text-emerald-800 text-sm">{whatsappNumber}</p>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600" /> Customer Standee QR
              </span>
              <p className="text-gray-600 leading-relaxed">
                Customers scan this standee on their phones to open WhatsApp and send documents directly to <strong>{whatsappNumber}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Right 8 cols: Printable Standee Poster */}
        <div className="lg:col-span-8 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl border-4 border-[#1e3a5f] shadow-2xl p-8 text-center space-y-5 print:m-0 print:border-none print:shadow-none font-sans">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-widest text-emerald-700 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                ● Instant WhatsApp Print Desk
              </span>
              <h1 className="text-2xl font-black text-[#1e3a5f] tracking-tight">
                SVV COMMUNICATIONS
              </h1>
              <p className="text-xs font-bold text-gray-700">
                {activeBranch?.branchName || 'Main Branch'} ({activeBranch?.branchCode || 'SVV-1'})
              </p>
            </div>

            {/* QR Code Frame */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-gray-50 to-emerald-50/50 border-2 border-dashed border-emerald-400 inline-block mx-auto shadow-inner">
              <QRCodeSVG
                value={qrLink}
                size={210}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Steps */}
            <div className="bg-[#1e3a5f] text-white p-3.5 rounded-2xl text-left space-y-1.5 text-xs">
              <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 3 Simple Steps to Print:
              </h4>
              <ol className="space-y-1 text-[11px] pl-4 list-decimal opacity-90 leading-snug">
                <li>Open camera or WhatsApp and <strong>Scan this QR Code</strong>.</li>
                <li>Send your <strong>PDF / Image file</strong> in the chat.</li>
                <li>Collect your <strong>Printed Pages & Token</strong> at counter!</li>
              </ol>
            </div>

            {/* Footer Support */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-600 font-mono">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Bot: <strong className="text-emerald-800">{whatsappNumber}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Edit Modal ─────────────────────────────────────────────────── */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-sm">
                <Phone className="w-4 h-4" /> Edit Branch WhatsApp Settings ({editingBranch.branchName})
              </div>
              <button onClick={() => setEditingBranch(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveActivation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Branch Mobile Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98480 12345"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-xs font-mono font-bold text-emerald-900"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Bot Display Name</label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Auto-Reply Welcome Message</label>
                <textarea
                  rows={3}
                  value={welcomeMsgInput}
                  onChange={(e) => setWelcomeMsgInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setEditingBranch(null)}>Cancel</Button>
                <Button
                  size="sm"
                  type="submit"
                  loading={upsertMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Save Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
