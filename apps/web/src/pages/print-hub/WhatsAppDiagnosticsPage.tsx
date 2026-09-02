/**
 * WhatsApp Diagnostics Page — SVV AMS
 * Route: /print-hub/whatsapp-diagnostics
 *
 * Live diagnostics for each branch's WhatsApp session.
 * All data comes from Supabase — zero hardcoded numbers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import WhatsAppGatewayModal from '@/components/shared/WhatsAppGatewayModal';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/stores/auth.store';
import {
  Activity, CheckCircle2, XCircle, RefreshCw, AlertTriangle,
  Smartphone, MessageSquare, Zap, Clock, Database,
  ShieldCheck, FileText, QrCode, Wifi
} from 'lucide-react';

interface BranchDiag {
  branchId: string;
  branchName: string;
  branchCode: string;
  sessionId: string | null;
  connectedNumber: string | null;
  status: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';
  connectedAt: string | null;
  lastUpdated: string | null;
  messageCount: number;
  orderCount: number;
  customerQr: string;
}

interface HealthCheck {
  supabaseLatency: number | null;
  supabaseStatus: 'OK' | 'ERROR' | 'CHECKING';
  realtimeStatus: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';
  webhookStatus: 'OK' | 'ERROR' | 'CHECKING';
}

export default function WhatsAppDiagnosticsPage() {
  const { user } = useAuthStore();
  const role: string = (user as any)?.primaryRole || (user as any)?.role || 'STAFF';
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'BRANCH_MANAGER';

  const [branches, setBranches] = useState<BranchDiag[]>([]);
  const [health, setHealth] = useState<HealthCheck>({
    supabaseLatency: null,
    supabaseStatus: 'CHECKING',
    realtimeStatus: 'CHECKING',
    webhookStatus: 'CHECKING',
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const buildCustomerQr = (phone: string | null, branchName: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    const withCountry = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
    return `https://wa.me/${withCountry}?text=${encodeURIComponent(`Hi ${branchName}, I want to print a document.`)}`;
  };

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    const start = Date.now();

    try {
      // Health: Supabase latency
      const { error: pingErr } = await supabase.from('branches').select('id').limit(1);
      const latency = Date.now() - start;
      setHealth(h => ({
        ...h,
        supabaseLatency: latency,
        supabaseStatus: pingErr ? 'ERROR' : 'OK',
      }));

      // Load branch data + wa configs
      const { data: branchRows } = await supabase.from('branches').select('*').order('createdAt', { ascending: true });
      const { data: waConfigs } = await supabase.from('branch_whatsapp_configs').select('*');
      const { data: messages } = await supabase.from('whatsapp_messages').select('branchId');
      const { data: orders } = await supabase.from('print_orders').select('branchId').eq('source', 'WHATSAPP');

      const activeBranches = (branchRows || []).filter((b: any) => b.isActive !== false);

      const diags: BranchDiag[] = activeBranches.map((b: any) => {
        const cfg = (waConfigs || []).find((c: any) => c.branchId === b.id);
        const phone = cfg?.whatsappNumber || b.whatsappNumber || b.phone || null;
        const isConn = cfg?.status === 'CONNECTED' && !!phone;

        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          sessionId: cfg?.id || null,
          connectedNumber: phone,
          status: isConn ? 'CONNECTED' : 'DISCONNECTED',
          connectedAt: cfg?.connectedAt || cfg?.updatedAt || null,
          lastUpdated: cfg?.updatedAt || null,
          messageCount: (messages || []).filter((m: any) => m.branchId === b.id).length,
          orderCount: (orders || []).filter((o: any) => o.branchId === b.id).length,
          customerQr: buildCustomerQr(phone, b.name),
        };
      });

      setBranches(diags);
      setLastRefresh(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
    } catch (e) {
      console.error('Diagnostics load error:', e);
      setHealth(h => ({ ...h, supabaseStatus: 'ERROR' }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Check Realtime and Webhook health separately
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase.channel('diag-health-check')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => {})
        .subscribe((status) => {
          setHealth(h => ({
            ...h,
            realtimeStatus: status === 'SUBSCRIBED' ? 'CONNECTED' : 'DISCONNECTED',
          }));
        });
    } catch {
      setHealth(h => ({ ...h, realtimeStatus: 'DISCONNECTED' }));
    }

    // Check webhook endpoint
    fetch('/api/whatsapp-webhook', { method: 'GET' })
      .then(r => setHealth(h => ({ ...h, webhookStatus: r.ok ? 'OK' : 'ERROR' })))
      .catch(() => setHealth(h => ({ ...h, webhookStatus: 'ERROR' })));

    loadDiagnostics();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadDiagnostics]);

  const handleTestOrder = async (b: BranchDiag) => {
    try {
      const now = new Date();
      const tokenNo = `T-${100 + Math.floor(Math.random() * 899)}`;
      await supabase.from('print_orders').insert([{
        id: crypto.randomUUID(),
        orderNo: `PRN-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${tokenNo.replace('T-', '')}`,
        tokenNumber: tokenNo,
        organizationId: 'svv-org-001',
        branchId: b.branchId,
        customerName: 'Test Customer (Diag)',
        customerPhone: b.connectedNumber || '+910000000000',
        source: 'WHATSAPP',
        documentUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
        documentName: `DiagTest_${tokenNo}.pdf`,
        pageCount: 1,
        colorMode: 'COLOR',
        copies: 1,
        totalAmount: 20,
        status: 'PENDING',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }]);
      alert(`✅ Test ticket created — Token: ${tokenNo} for ${b.branchName}`);
      loadDiagnostics();
    } catch (err: any) {
      alert(`❌ Test failed: ${err.message}`);
    }
  };

  const statusBadge = (status: BranchDiag['status']) => {
    if (status === 'CONNECTED') return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        CONNECTED
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        DISCONNECTED
      </span>
    );
  };

  const healthBadge = (s: 'OK' | 'ERROR' | 'CONNECTED' | 'DISCONNECTED' | 'CHECKING') => {
    if (s === 'OK' || s === 'CONNECTED') return <span className="text-emerald-600 font-bold text-xs">✅ {s}</span>;
    if (s === 'ERROR' || s === 'DISCONNECTED') return <span className="text-red-600 font-bold text-xs">❌ {s}</span>;
    return <span className="text-amber-500 font-bold text-xs animate-pulse">⏳ {s}</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="WhatsApp Diagnostics"
        subtitle="Live session health, connection status, and message counters for all branches. All data from Supabase — no hardcoded values."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDiagnostics}
              disabled={loading}
              className="text-xs font-bold h-9 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>
        }
      />

      {/* Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
            <Database className="w-4 h-4 text-blue-600" /> Supabase
          </div>
          <div>{healthBadge(health.supabaseStatus)}</div>
          {health.supabaseLatency !== null && (
            <div className="text-[11px] text-gray-400 mt-1">{health.supabaseLatency}ms latency</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
            <Wifi className="w-4 h-4 text-purple-600" /> Realtime
          </div>
          <div>{healthBadge(health.realtimeStatus)}</div>
          <div className="text-[11px] text-gray-400 mt-1">Supabase live channel</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
            <Zap className="w-4 h-4 text-amber-600" /> Webhook
          </div>
          <div>{healthBadge(health.webhookStatus)}</div>
          <div className="text-[11px] text-gray-400 mt-1">/api/whatsapp-webhook</div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase mb-2">
            <Clock className="w-4 h-4 text-gray-500" /> Last Refresh
          </div>
          <div className="text-xs font-bold text-gray-800">{lastRefresh || '—'}</div>
          <div className="text-[11px] text-gray-400 mt-1">IST (Asia/Kolkata)</div>
        </div>
      </div>

      {/* Branch Diagnostics */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading diagnostics from Supabase...</div>
      ) : branches.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-gray-300 p-8">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">No branches found in Supabase</p>
          <p className="text-xs text-gray-400 mt-1">Go to Branches page and add your branch details first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {branches.map((b) => (
            <div key={b.branchId} className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              {/* Branch Header */}
              <div className={`px-6 py-4 flex items-center justify-between border-b ${
                b.status === 'CONNECTED' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-black text-sm text-gray-800 shadow-xs">
                    {b.branchCode}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{b.branchName}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">ID: <code className="font-mono">{b.branchId}</code></p>
                  </div>
                </div>
                {statusBadge(b.status)}
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left: Stats */}
                <div className="md:col-span-7 space-y-4">
                  {/* Key Fields */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-gray-500 font-bold uppercase text-[10px] flex items-center gap-1 mb-1">
                        <Smartphone className="w-3.5 h-3.5" /> Connected Number
                      </div>
                      <div className="font-mono font-bold text-gray-900 text-sm">
                        {b.connectedNumber || <span className="text-red-500 font-medium text-xs">Not Set</span>}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-gray-500 font-bold uppercase text-[10px] flex items-center gap-1 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Session ID
                      </div>
                      <div className="font-mono text-[10px] text-gray-600 break-all">
                        {b.sessionId || <span className="text-gray-400">No session record</span>}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-gray-500 font-bold uppercase text-[10px] flex items-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5" /> Last Connection
                      </div>
                      <div className="text-gray-800 font-semibold text-[11px]">
                        {b.connectedAt
                          ? new Date(b.connectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })
                          : <span className="text-gray-400">Never connected</span>}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="text-gray-500 font-bold uppercase text-[10px] flex items-center gap-1 mb-1">
                        <QrCode className="w-3.5 h-3.5" /> QR Status
                      </div>
                      <div className={`font-bold text-xs ${b.connectedNumber ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {b.connectedNumber ? '✅ QR Ready (wa.me link)' : '⚠️ Set phone number first'}
                      </div>
                    </div>
                  </div>

                  {/* Counters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                      <div className="text-[10px] text-blue-600 font-bold uppercase flex items-center justify-center gap-1 mb-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Messages
                      </div>
                      <div className="text-2xl font-black text-blue-700">{b.messageCount}</div>
                      <div className="text-[10px] text-blue-500 mt-0.5">received via WhatsApp</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 text-center">
                      <div className="text-[10px] text-purple-600 font-bold uppercase flex items-center justify-center gap-1 mb-1">
                        <FileText className="w-3.5 h-3.5" /> Tickets
                      </div>
                      <div className="text-2xl font-black text-purple-700">{b.orderCount}</div>
                      <div className="text-[10px] text-purple-500 mt-0.5">auto-created from WhatsApp</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => setSelectedBranchId(b.branchId)}
                        className={`text-xs font-bold rounded-xl cursor-pointer ${
                          b.status === 'CONNECTED'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#00a884] hover:bg-[#02906f] text-white'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                        {b.status === 'CONNECTED' ? 'Manage Session' : 'Connect WhatsApp'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestOrder(b)}
                        className="text-xs font-bold rounded-xl cursor-pointer border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        <Activity className="w-3.5 h-3.5 mr-1.5" />
                        Send Test Order
                      </Button>
                    </div>
                  )}

                  {/* Connection Health Summary */}
                  <div className="text-xs space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="font-bold text-gray-600 uppercase text-[10px] mb-2">Connection Health</div>
                    {[
                      { label: 'Branch configured in Supabase', ok: true },
                      { label: 'Phone number saved', ok: !!b.connectedNumber },
                      { label: 'WhatsApp session active', ok: b.status === 'CONNECTED' },
                      { label: 'Customer QR generated', ok: !!b.customerQr },
                      { label: 'Session ID in database', ok: !!b.sessionId },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {item.ok
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        }
                        <span className={item.ok ? 'text-gray-700' : 'text-red-600 font-semibold'}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Customer QR */}
                <div className="md:col-span-5 flex flex-col items-center justify-start gap-3">
                  <div className="text-xs font-bold text-gray-500 uppercase text-center">Customer Desk QR</div>
                  {b.customerQr ? (
                    <>
                      <div className="bg-white p-3 rounded-2xl shadow-md border-4 border-gray-100 relative">
                        <QRCodeSVG
                          value={b.customerQr}
                          size={160}
                          level="H"
                          includeMargin={false}
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#00a884] shadow-sm">
                            <MessageSquare className="w-5 h-5 fill-current" />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 text-center max-w-[180px]">
                        Customers scan this to send documents. Fresh QR — never cached.
                      </p>
                      <a
                        href={b.customerQr}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#00a884] hover:underline font-bold"
                      >
                        Test link ↗
                      </a>
                    </>
                  ) : (
                    <div className="w-full py-8 flex flex-col items-center gap-2 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <QrCode className="w-8 h-8" />
                      <p className="text-xs text-center text-gray-500">
                        Set branch phone number to generate customer QR
                      </p>
                      {canManage && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedBranchId(b.branchId)}
                          className="mt-1 text-xs bg-[#081B3A] text-white rounded-xl cursor-pointer"
                        >
                          Set Phone
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WhatsApp Modal for reconnect */}
      {selectedBranchId && (
        <WhatsAppGatewayModal
          open={true}
          onClose={() => { setSelectedBranchId(null); loadDiagnostics(); }}
          branchId={selectedBranchId}
          onOrderCreated={() => { setSelectedBranchId(null); loadDiagnostics(); }}
        />
      )}
    </div>
  );
}
