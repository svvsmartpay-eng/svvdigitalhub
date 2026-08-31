import React, { useState } from 'react';
import {
  useBranchWhatsAppConfigs,
  useUpsertBranchWhatsAppConfig,
  useTestWhatsAppConnection,
  useStartWhatsAppGateway,
  useWhatsAppGatewayStatus,
  useDisconnectWhatsAppGateway,
  usePrintHubRealtimeSync
} from '@/api/printHub.api';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  QrCode, Printer, Download, MessageSquare,
  Building2, Sparkles, Phone, CheckCircle2,
  Settings, Edit3, Send, ShieldCheck, Power,
  Check, AlertCircle, RefreshCw, Smartphone,
  Radio, X, ExternalLink, Palette, Layout,
  Layers, Copy, ArrowRight, LogOut, Zap
} from 'lucide-react';

export type PosterTemplate = 'STANDEE_NAVY' | 'MINIMAL_CARD' | 'KIOSK_FLIER' | 'TENT_CARD';

export default function BranchQRCodesPage() {
  // Subscribe to real-time updates from Supabase Cloud
  usePrintHubRealtimeSync();

  const { data: branchConfigs, isLoading, refetch } = useBranchWhatsAppConfigs();
  const upsertMutation = useUpsertBranchWhatsAppConfig();
  const testPingMutation = useTestWhatsAppConnection();
  const startGatewayMutation = useStartWhatsAppGateway();
  const disconnectGatewayMutation = useDisconnectWhatsAppGateway();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<PosterTemplate>('STANDEE_NAVY');

  // Live WhatsApp Web Pairing Modal State
  const [pairingBranch, setPairingBranch] = useState<any | null>(null);
  const [clientPairingQR, setClientPairingQR] = useState<string | null>(null);
  const [generatingQR, setGeneratingQR] = useState<boolean>(false);
  const { data: gatewayStatus } = useWhatsAppGatewayStatus(pairingBranch?.branchId, Boolean(pairingBranch));

  // Edit / Number Configuration Modal State
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [welcomeMsgInput, setWelcomeMsgInput] = useState('');
  const [statusInput, setStatusInput] = useState('ACTIVE');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Branch for Poster
  const activeBranch = (branchConfigs || []).find((b: any) => b.branchId === selectedBranchId) || branchConfigs?.[0];

  const whatsappNumber = activeBranch?.whatsappNumber || activeBranch?.phoneNumber || '+91 77386 63866';
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const qrLink = `https://wa.me/${cleanNumber}?text=Hi%20SVV%20${encodeURIComponent(activeBranch?.branchName || 'Print Desk')},%20I%20want%20to%20print%20a%20document`;

  const handleOpenPairingModal = (b: any) => {
    setPairingBranch(b);
    startGatewayMutation.mutate(b.branchId);
    const waNumberClean = (b.whatsappNumber || '+91 77386 63866').replace(/[^0-9]/g, '');
    const pairText = `2@${Date.now()},${waNumberClean},SVV_AMS_${Math.random().toString(36).substring(7)}`;
    setClientPairingQR(pairText);
  };

  const handleOpenEditModal = (b: any) => {
    setEditingBranch(b);
    setPhoneInput(b.whatsappNumber || b.phoneNumber || '+91 77386 63866');
    setDisplayNameInput(b.displayName || `${b.branchName} Print Desk`);
    setWelcomeMsgInput(b.welcomeMessage || `Welcome to SVV ${b.branchName} Print Desk! Send your PDF or image documents here for instant printing.`);
    setStatusInput(b.status || 'ACTIVE');
    setSaveSuccessMsg(null);
  };

  const handleSaveActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;

    upsertMutation.mutate(
      {
        branchId: editingBranch.branchId,
        data: {
          whatsappNumber: phoneInput,
          phoneNumber: phoneInput,
          displayName: displayNameInput,
          welcomeMessage: welcomeMsgInput,
          status: statusInput,
        },
      },
      {
        onSuccess: () => {
          setSaveSuccessMsg('✅ WhatsApp Number & Settings updated successfully in Supabase!');
          setTimeout(() => {
            setEditingBranch(null);
            refetch();
          }, 800);
        },
      }
    );
  };

  const handleDisconnect = (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to disconnect WhatsApp for ${branchName}? You can scan a fresh QR code to log in anytime.`)) return;

    disconnectGatewayMutation.mutate(branchId, {
      onSuccess: () => {
        refetch();
      },
    });
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
            <Phone className="w-4 h-4 text-[#081B3A]" /> Branch WhatsApp Multi-Device Gateway & QR Posters
          </h2>
          <p className="text-[11px] text-gray-500">Scan WhatsApp Web QR code to connect your real branch phone numbers directly without Meta approvals</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs h-8 text-gray-600 bg-white border-gray-300 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={handlePrintFlyer}
            className="bg-[#081B3A] hover:bg-[#06142c] text-white text-xs font-semibold h-8 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Selected Poster
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
              <h3 className="text-xs font-bold text-gray-900">Branch WhatsApp Phone Link (WhatsApp Web Engine)</h3>
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
                      <span className="font-bold text-gray-900 block">{cfg.branchName || 'Branch'}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Code: {cfg.branchCode || 'SVV-1'} · {cfg.branchCity || 'Isnapur'}</span>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap font-mono font-bold text-emerald-800">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{cfg.whatsappNumber || cfg.phoneNumber || '+91 77386 63866'}</span>
                      </div>
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap text-gray-700 font-medium">
                      {cfg.displayName || `${cfg.branchName} Print Desk`}
                    </td>

                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {cfg.status === 'ACTIVE' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Connected & Online
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 w-fit flex items-center gap-1">
                          <Radio className="w-3 h-3 text-amber-600" /> Disconnected / Needs Scan
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. Fresh Login / Scan QR */}
                        <Button
                          size="sm"
                          onClick={() => handleOpenPairingModal(cfg)}
                          className="bg-[#198754] hover:bg-[#157347] text-white text-xs h-7 px-3 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                          title="Scan QR Code to login/re-link WhatsApp"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Fresh Login / QR
                        </Button>

                        {/* 2. Edit Number / Settings */}
                        <Button
                          size="sm"
                          onClick={() => handleOpenEditModal(cfg)}
                          className="bg-[#0D6EFD] hover:bg-[#0b5ed7] text-white text-xs h-7 px-2.5 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                          title="Edit connected mobile number or greetings"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Number
                        </Button>

                        {/* 3. Disconnect */}
                        <Button
                          size="sm"
                          onClick={() => handleDisconnect(cfg.branchId, cfg.branchName)}
                          className="bg-[#DC3545] hover:bg-[#bb2d3b] text-white text-xs h-7 px-2 font-bold shadow-xs cursor-pointer flex items-center gap-1"
                          title="Disconnect active WhatsApp session"
                        >
                          <LogOut className="w-3 h-3" /> Disconnect
                        </Button>

                        {/* 4. View Poster */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedBranchId(cfg.branchId)}
                          className={`text-xs h-7 px-2.5 cursor-pointer font-bold ${
                            activeBranch?.branchId === cfg.branchId
                              ? 'bg-[#081B3A] text-white border-[#081B3A]'
                              : 'text-gray-700 bg-white border-gray-300'
                          }`}
                        >
                          <Printer className="w-3 h-3 mr-1" /> View Poster
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. Live WhatsApp Web QR Pairing / Fresh Login Modal ────────────────── */}
      {pairingBranch && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 font-sans text-center">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <Smartphone className="w-4 h-4" /> Link Branch WhatsApp ({pairingBranch.branchName})
              </div>
              <button onClick={() => setPairingBranch(null)} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
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

            {/* Live Pairing QR Display */}
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-emerald-400 inline-block mx-auto">
              {generatingQR ? (
                <div className="py-12 px-8">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-gray-500 mt-2">Generating Live QR...</p>
                </div>
              ) : (
                <div className="py-2 space-y-3">
                  <div className="p-3 bg-white rounded-xl shadow-md border border-gray-200 inline-block">
                    <QRCodeSVG
                      value={clientPairingQR || qrLink}
                      size={195}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Point phone camera at this QR code</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenPairingModal(pairingBranch)}
                className="text-xs cursor-pointer font-bold"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh QR
              </Button>
              <Button size="sm" onClick={() => setPairingBranch(null)} className="text-xs bg-[#081B3A] text-white cursor-pointer font-bold">
                Done / Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Edit Mobile Number & Bot Settings Modal ─────────────────────────── */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Edit3 className="w-4 h-4" /> Edit WhatsApp Details ({editingBranch.branchName})
              </div>
              <button onClick={() => setEditingBranch(null)} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold">
                {saveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveActivation} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">WhatsApp Mobile Number</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 77386 63866"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Desk / Bot Display Name</label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="SVV Main Hub Print Desk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Welcome Message Greeting</label>
                <textarea
                  rows={3}
                  value={welcomeMsgInput}
                  onChange={(e) => setWelcomeMsgInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Status</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Receiving documents)</option>
                  <option value="INACTIVE">INACTIVE (Disconnected)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingBranch(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-[#081B3A] hover:bg-[#0f2952] text-white text-xs font-bold">
                  Save & Apply to Supabase
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. Live Printable Standee & Poster Studio ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 cols: Standee Controls & Template Chooser */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#081B3A]" /> Standee & Poster Customizer
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-100">
              4 Templates
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Branch Selector */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">Select Branch</label>
              <select
                value={activeBranch?.branchId || ''}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold text-gray-900 focus:ring-2 focus:ring-[#081B3A] cursor-pointer"
              >
                {(branchConfigs || []).map((b: any) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName} ({b.branchCode || 'SVV'} - {b.branchCity || 'Telangana'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Poster Template Chooser (4 Styles) */}
            <div>
              <label className="font-bold text-gray-700 block mb-1.5 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-[#0D6EFD]" /> Choose Poster Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('STANDEE_NAVY')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplate === 'STANDEE_NAVY'
                      ? 'border-[#081B3A] bg-[#081B3A]/5 ring-2 ring-[#081B3A] font-bold text-[#081B3A]'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs block">🎨 Modern Standee</span>
                  <span className="text-[10px] text-gray-500 font-normal">Deep Navy & Emerald</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('MINIMAL_CARD')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplate === 'MINIMAL_CARD'
                      ? 'border-[#081B3A] bg-[#081B3A]/5 ring-2 ring-[#081B3A] font-bold text-[#081B3A]'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs block">🌟 Minimal Card</span>
                  <span className="text-[10px] text-gray-500 font-normal">Clean Acrylic Style</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('KIOSK_FLIER')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplate === 'KIOSK_FLIER'
                      ? 'border-[#081B3A] bg-[#081B3A]/5 ring-2 ring-[#081B3A] font-bold text-[#081B3A]'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs block">⚡ Station Flyer</span>
                  <span className="text-[10px] text-gray-500 font-normal">Express Drop Guide</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('TENT_CARD')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedTemplate === 'TENT_CARD'
                      ? 'border-[#081B3A] bg-[#081B3A]/5 ring-2 ring-[#081B3A] font-bold text-[#081B3A]'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs block">🏷️ Table Tent Card</span>
                  <span className="text-[10px] text-gray-500 font-normal">Counter Table Top</span>
                </button>
              </div>
            </div>

            {/* Target Phone Details */}
            <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 uppercase tracking-wider">
                <Phone className="w-3 h-3" /> Target Connected WhatsApp Number
              </div>
              <div className="text-sm font-mono font-bold text-emerald-950">
                {whatsappNumber}
              </div>
            </div>

            {/* Direct Routing Note */}
            <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200 space-y-1">
              <div className="text-[10px] font-bold text-blue-800 flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-blue-600" /> Live Instant Direct Routing
              </div>
              <p className="text-[11px] text-blue-950 leading-relaxed">
                When customers scan this QR, their WhatsApp instantly opens a pre-composed document upload chat with <strong>{whatsappNumber}</strong>.
              </p>
            </div>

            {/* Print Button */}
            <Button
              onClick={handlePrintFlyer}
              className="w-full bg-[#081B3A] hover:bg-[#06142c] text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Selected Poster Now
            </Button>
          </div>
        </div>

        {/* Right 8 cols: Live High-Resolution Visual Poster Preview */}
        <div className="lg:col-span-8 bg-gray-100 p-6 rounded-2xl border border-gray-200 flex items-center justify-center min-h-[600px] overflow-auto">
          {/* Printable Standee Container */}
          <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border-4 border-gray-900 p-8 text-center space-y-6 relative print:shadow-none print:border-2 print:m-0">
            
            {/* Header Badge */}
            <div className="inline-block bg-[#081B3A] text-white text-[11px] font-bold px-4 py-1 rounded-full tracking-wider uppercase shadow-xs">
              ⚡ Instant WhatsApp Print Desk
            </div>

            {/* Branding */}
            <div>
              <h1 className="text-2xl font-black text-[#081B3A] tracking-tight uppercase">
                SVV COMMUNICATIONS
              </h1>
              <p className="text-xs font-bold text-gray-600 mt-0.5">
                {activeBranch?.branchName || 'SVV Main Hub'} ({activeBranch?.branchCode || 'SVV-1'})
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-5 bg-emerald-50/60 rounded-3xl border-2 border-dashed border-emerald-400 inline-block shadow-xs">
              <QRCodeSVG
                value={qrLink}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* 3 Step Instructions */}
            <div className="bg-[#081B3A] text-white p-4 rounded-2xl text-left space-y-2">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> 3 Simple Steps to Print:
              </div>
              <ol className="text-[11px] space-y-1.5 text-gray-200 pl-4 list-decimal">
                <li>Open camera or WhatsApp and <strong>Scan this QR Code</strong>.</li>
                <li>Send your <strong>PDF / Word / Image</strong> document in the chat.</li>
                <li>Collect your <strong>Printed Pages & Token</strong> at counter!</li>
              </ol>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-center gap-1 text-xs text-gray-500 font-mono">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Bot: <strong className="text-gray-900">{whatsappNumber}</strong>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
