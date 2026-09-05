import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import { useAuthStore } from '@/stores/auth.store';
import { useDashboard } from '@/api/dashboard.api';
import { useFilterStore } from '@/stores/filter.store';
import { usePluginSettings } from '@/api/plugins.api';
import { usePrintHubAnalytics } from '@/api/printHub.api';
import {
  Box, AlertCircle, Wrench, Calendar, IndianRupee, Activity,
  TrendingDown, Shield, LayoutList, Clock, AlertTriangle,
  CheckCircle, Paperclip, X, FileText, ArrowRight, PlusCircle,
  Printer, MessageSquare, Ticket, Sparkles
} from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAssets } from '@/api/assets.api';
import { useRaiseIssue } from '@/api/issues.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const role = user?.primaryRole || user?.role || user?.roles?.[0] || 'SUPER_ADMIN';
  const { dateFrom, dateTo, selectedBranches } = useFilterStore();

  const [newTicketAssetId, setNewTicketAssetId] = useState('');
  const [newTicketContent, setNewTicketContent] = useState('');
  const [newTicketFiles, setNewTicketFiles] = useState<File[]>([]);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterParams: any = {};
  if (dateFrom) filterParams.dateFrom = dateFrom;
  if (dateTo) filterParams.dateTo = dateTo;
  if (selectedBranches.length > 0) filterParams.branchId = selectedBranches.join(',');

  const { data, isLoading, isError, refetch } = useDashboard(filterParams);
  const { data: assetsData } = useAssets({ limit: 100 });
  const { data: pluginSettings } = usePluginSettings();
  const isPrintHubActive = Boolean(pluginSettings?.print_whatsapp_hub);
  const { data: printAnalytics } = usePrintHubAnalytics(selectedBranches?.[0]);
  const raiseIssueMutation = useRaiseIssue();

  const handleRaiseTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketAssetId || !newTicketContent) return;

    const asset = assetsData?.find((a: any) => a.id === newTicketAssetId);

    raiseIssueMutation.mutate(
      {
        title: newTicketContent.length > 40 ? newTicketContent.substring(0, 40) + '...' : newTicketContent,
        description: newTicketContent,
        assetId: newTicketAssetId,
        branchId: asset?.branchId || user?.branchId,
        priority: 'MEDIUM',
        photos: newTicketFiles,
      },
      {
        onSuccess: () => {
          setTicketSuccess(true);
          setNewTicketContent('');
          setNewTicketAssetId('');
          setNewTicketFiles([]);
          setTimeout(() => setTicketSuccess(false), 4000);
        },
      }
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (isError) {
    return (
      <div className="space-y-6">
      {role === 'SUPER_ADMIN' && (
        <div className="mb-8 bg-[#081B3A] text-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">?? Platform Super Admin</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Owners / Tenants</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Branches</div>
              <div className="text-2xl font-black">4</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Active WhatsApp Hubs</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-200">Total Print Tokens</div>
              <div className="text-2xl font-black">156</div>
            </div>
          </div>
        </div>
      )}

      {role === 'ADMIN' && (
        <div className="mb-8 bg-blue-600 text-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">?? Business Owner Dashboard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">My Branches</div>
              <div className="text-2xl font-black">2</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Total Staff</div>
              <div className="text-2xl font-black">12</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Today's Print Jobs</div>
              <div className="text-2xl font-black">34</div>
            </div>
            <div className="bg-white/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-blue-100">Pending Work Orders</div>
              <div className="text-2xl font-black">5</div>
            </div>
          </div>
        </div>
      )}

        <PageHeader title="Dashboard" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center space-y-4 shadow-2xs">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-red-700 font-semibold text-lg">Failed to load dashboard metrics</p>
          <p className="text-red-500 text-xs">Please check your connection or database status and try again.</p>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const stats = data?.summary || {
    totalAssets: 0, operationalAssets: 0, breakdownAssets: 0,
    openIssues: 0, criticalIssues: 0, inProgressVisits: 0,
    pmDue: 0, pmOverdue: 0, slaBreaches: 0, monthCost: 0, ytdCost: 0,
  };

  const userStats = data?.userStats;
  const isAdminRole = ['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'].includes(role || '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name || 'User'} (${user?.primaryRole?.replace('_', ' ') || 'Staff'})`}
      />

      {/* ── ADMIN & BRANCH MANAGER DASHBOARD ───────────────────────────────── */}
      {isAdminRole && (
        <>
          {/* Primary Operations Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              label="Total Assets"
              value={stats.totalAssets}
              icon={<Box />}
              color="blue"
              onClick={() => navigate('/assets')}
            />
            <StatsCard
              label="Operational Assets"
              value={stats.operationalAssets}
              icon={<Activity />}
              color="green"
              onClick={() => navigate('/assets?status=OPERATIONAL')}
            />
            <StatsCard
              label="Breakdown Assets"
              value={stats.breakdownAssets}
              icon={<TrendingDown />}
              color="red"
              onClick={() => navigate('/assets?status=BREAKDOWN')}
            />
            <StatsCard
              label="Open Issues"
              value={stats.openIssues}
              icon={<AlertCircle />}
              color="amber"
              onClick={() => navigate('/issues?status=OPEN')}
            />
            <StatsCard
              label="Critical / High Issues"
              value={stats.criticalIssues}
              icon={<AlertCircle />}
              color="red"
              onClick={() => navigate('/issues?priority=CRITICAL')}
            />
            <StatsCard
              label="In-Progress Visits"
              value={stats.inProgressVisits}
              icon={<Wrench />}
              color="blue"
              onClick={() => navigate('/service-visits?status=IN_PROGRESS')}
            />
          </div>

          {/* Maintenance, Compliance & Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              label="Today's Expense (₹)"
              value={`₹${Number(stats.todayCost || 0).toLocaleString('en-IN')}`}
              icon={<IndianRupee />}
              color="green"
              onClick={() => navigate('/costs')}
            />
            <StatsCard
              label="Monthly Spend (₹)"
              value={`₹${Number(stats.monthCost || 0).toLocaleString('en-IN')}`}
              icon={<IndianRupee />}
              color="blue"
              onClick={() => navigate('/costs')}
            />
            <StatsCard
              label="Total Lifecycle Maintenance (₹)"
              value={`₹${Number(stats.totalMaintenanceCost || 0).toLocaleString('en-IN')}`}
              icon={<Wrench />}
              color="purple"
              onClick={() => navigate('/costs')}
            />
            <StatsCard
              label="Needing Replacement"
              value={stats.needingReplacementCount || 0}
              icon={<AlertTriangle />}
              color="red"
              onClick={() => navigate('/assets?condition=POOR')}
            />
          </div>

          {/* Print & WhatsApp Service Hub Plugin Live Snapshot (Only When Enabled) */}
          {isPrintHubActive && printAnalytics?.widgets && (
            <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-blue-50/60 rounded-2xl border border-emerald-200 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <span>Print & WhatsApp Service Hub Snapshot</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Plugin Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500">Live operational prints, WhatsApp bot queue, and counter collections</p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate('/print-hub/queue')}
                  className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-8"
                >
                  Open Print Desk <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                {/* 1. New WhatsApp Orders */}
                <div
                  onClick={() => navigate('/print-hub/inbox')}
                  className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs cursor-pointer hover:border-emerald-500 transition-all space-y-1"
                >
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">New WhatsApp Orders</span>
                  <div className="text-xl font-black text-emerald-900 font-mono">{printAnalytics.widgets.newWhatsAppOrders}</div>
                  <span className="text-[10px] text-gray-400">Incoming Today</span>
                </div>

                {/* 2. Pending Print Jobs */}
                <div
                  onClick={() => navigate('/print-hub/queue')}
                  className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs cursor-pointer hover:border-amber-500 transition-all space-y-1"
                >
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Pending Print Jobs</span>
                  <div className="text-xl font-black text-amber-900 font-mono">{printAnalytics.widgets.pendingPrintJobs}</div>
                  <span className="text-[10px] text-gray-400">In Active Queue</span>
                </div>

                {/* 3. Ready For Delivery */}
                <div
                  onClick={() => navigate('/print-hub/tokens')}
                  className="bg-white p-3 rounded-xl border border-teal-200/80 shadow-2xs cursor-pointer hover:border-teal-500 transition-all space-y-1"
                >
                  <span className="text-[10px] font-bold text-teal-800 uppercase block">Ready For Delivery</span>
                  <div className="text-xl font-black text-teal-900 font-mono">{printAnalytics.widgets.readyForDelivery}</div>
                  <span className="text-[10px] text-gray-400">Token Pickup Ready</span>
                </div>

                {/* 4. Today's Prints */}
                <div
                  onClick={() => navigate('/print-hub/queue')}
                  className="bg-white p-3 rounded-xl border border-blue-200/80 shadow-2xs cursor-pointer hover:border-blue-500 transition-all space-y-1"
                >
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Today's Prints</span>
                  <div className="text-xl font-black text-blue-900 font-mono">{printAnalytics.widgets.todayPrints}</div>
                  <span className="text-[10px] text-gray-400">₹{printAnalytics.widgets.todayRevenue} Revenue</span>
                </div>

                {/* 5. Branch Performance */}
                <div
                  onClick={() => navigate('/print-hub/analytics')}
                  className="bg-white p-3 rounded-xl border border-purple-200/80 shadow-2xs cursor-pointer hover:border-purple-500 transition-all space-y-1"
                >
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">Branch Performance</span>
                  <div className="text-xl font-black text-purple-900 font-mono">
                    {printAnalytics.branchPerformance?.length || 0} Branches
                  </div>
                  <span className="text-[10px] text-gray-400">₹{printAnalytics.widgets.totalRevenue} Total Spend</span>
                </div>
              </div>
            </div>
          )}

          {/* Replacement Planning Alert Banner (If Any Critical Assets) */}
          {data?.assetsNeedingReplacement && data.assetsNeedingReplacement.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-2xs border border-red-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                  <span>Asset Replacement Planning Alert ({data.assetsNeedingReplacement.length} Assets Flagged)</span>
                </div>
                <span className="text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-semibold">
                  Health & Cost Thresholds Exceeded
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                The following assets have low health scores or their cumulative maintenance cost exceeds 50% of original purchase price. Immediate replacement review is recommended.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {data.assetsNeedingReplacement.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={() => navigate(`/assets/${a.id}`)}
                    className="bg-white rounded-lg p-3 border border-red-200 hover:border-red-400 cursor-pointer shadow-2xs transition-all space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-[#1e3a5f]">{a.assetId}</span>
                        <h4 className="text-xs font-bold text-gray-900 truncate max-w-[170px]">{a.name}</h4>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        Score: {a.healthScore}/100
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 space-y-0.5 pt-1 border-t border-gray-100">
                      <div className="flex justify-between">
                        <span>Maintenance Spend:</span>
                        <strong className="text-gray-900 font-mono">₹{a.totalMaintenanceCost.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Spend vs Purchase:</span>
                        <strong className="text-red-700 font-mono">{a.spendRatio}%</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Maintenance Cost Assets & Branch Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top 5 Cost Assets */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-[#1e3a5f]" /> Top Maintenance Cost Assets
                </h3>
                <span className="text-xs text-gray-400 font-medium">Cumulative spend</span>
              </div>
              {data?.topCostAssets && data.topCostAssets.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.topCostAssets.map((asset: any) => (
                    <div
                      key={asset.id}
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      className="py-3 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer rounded-lg px-2 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[11px] font-bold text-[#1e3a5f]">{asset.assetId}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                            {asset.branch?.code}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 truncate">{asset.name}</p>
                        <p className="text-[10px] text-gray-400">Purchase Price: ₹{asset.purchaseCost.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-gray-900">
                          ₹{asset.totalMaintenanceCost.toLocaleString('en-IN')}
                        </div>
                        <span className={`text-[10px] font-semibold ${
                          asset.spendRatio > 50 ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {asset.spendRatio}% of purchase
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-4 text-center">No maintenance expenses recorded yet.</p>
              )}
            </div>

            {/* Branch Breakdown Table */}
            {data?.branchStats && data.branchStats.length > 0 && (
              <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">Branch Performance Overview</h3>
                  <span className="text-xs text-gray-400 font-medium">Click row to view</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500 font-semibold uppercase tracking-wider">
                        <th className="pb-2 font-medium">Branch</th>
                        <th className="pb-2 font-medium text-center">Assets</th>
                        <th className="pb-2 font-medium text-center">Open</th>
                        <th className="pb-2 font-medium text-right">Month Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.branchStats.map((b: any) => (
                        <tr
                          key={b.branchId}
                          onClick={() => navigate(`/assets?branchId=${b.branchId}`)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 font-semibold text-gray-900">
                            {b.branchName} <span className="text-gray-400 font-mono text-[10px]">({b.branchCode})</span>
                          </td>
                          <td className="py-2.5 text-center font-mono text-gray-700">{b.assets}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-mono font-semibold text-[10px] ${
                              b.openIssues > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {b.openIssues}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-gray-900">
                            ₹{Number(b.monthCost || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── STAFF DASHBOARD ────────────────────────────────────────────────── */}
      {role === 'STAFF' && (
        <div className="space-y-6">
          {/* Raise Ticket Quick Widget */}
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
            <h3 className="text-base font-bold mb-3 flex items-center gap-2 text-gray-900">
              <PlusCircle className="w-5 h-5 text-[#1e3a5f]" /> Need Help? Raise a Ticket Immediately
            </h3>

            {ticketSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ticket raised successfully! Assigned team will review shortly.</span>
              </div>
            )}

            <form onSubmit={handleRaiseTicket} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  className="sm:w-1/3 flex h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                  value={newTicketAssetId}
                  onChange={(e) => setNewTicketAssetId(e.target.value)}
                  required
                >
                  <option value="">Select Asset / Location...</option>
                  {assetsData?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.assetId})</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Input
                    placeholder="Describe the issue... (e.g. Printer in Lobby is jammed or screen is blank)"
                    value={newTicketContent}
                    onChange={(e) => setNewTicketContent(e.target.value)}
                    required
                    className="h-10 text-xs rounded-lg"
                  />
                </div>
              </div>

              {newTicketFiles.length > 0 && (
                <div className="flex flex-wrap gap-3 py-2">
                  {newTicketFiles.map((file, i) => {
                    const isImage = file.type.startsWith('image/');
                    const isVideo = file.type.startsWith('video/');
                    const url = URL.createObjectURL(file);

                    return (
                      <div key={i} className="relative group w-16 h-16 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setNewTicketFiles(prev => prev.filter((_, index) => index !== i))}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {isImage ? (
                          <img src={url} alt="preview" className="w-full h-full object-cover" />
                        ) : isVideo ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center p-1 text-[10px] text-center text-gray-500">
                            <FileText className="w-5 h-5 text-gray-400 mb-0.5" />
                            <span className="line-clamp-1">{file.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-1">
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  multiple
                  onChange={e => e.target.files && setNewTicketFiles(Array.from(e.target.files))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 text-xs hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-3.5 h-3.5 mr-1.5" /> Attach Photo / Video / Doc
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={raiseIssueMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-5"
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>

          {/* User Specific Task Cards (All Clickable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              label="Today's Tasks"
              value={userStats?.todaysTasks ?? 0}
              icon={<LayoutList />}
              color="blue"
              onClick={() => navigate('/issues')}
            />
            <StatsCard
              label="Pending Issues"
              value={userStats?.pending ?? 0}
              icon={<Clock />}
              color="amber"
              onClick={() => navigate('/issues?status=OPEN')}
            />
            <StatsCard
              label="Delayed / Overdue"
              value={userStats?.delayed ?? 0}
              icon={<AlertTriangle />}
              color="red"
              onClick={() => navigate('/issues?sla=breached')}
            />
            <StatsCard
              label="Completed Today"
              value={userStats?.completedToday ?? 0}
              icon={<CheckCircle />}
              color="green"
              onClick={() => navigate('/issues?status=RESOLVED')}
            />
          </div>

          {/* Actionable Issues & PM Tasks Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actionable Issues */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Actionable Issues ({userStats?.actionableIssues?.length || 0})
                </h3>
                <button onClick={() => navigate('/issues')} className="text-xs text-[#1e3a5f] font-semibold hover:underline">
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {userStats?.actionableIssues?.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-6">No pending issues require your immediate action.</p>
                ) : (
                  userStats?.actionableIssues?.map((issue: any) => (
                    <div
                      key={issue.id}
                      onClick={() => navigate(`/issues/${issue.id}`)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-[#1e3a5f] hover:bg-blue-50/30 cursor-pointer flex justify-between items-center gap-3 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] font-bold text-[#1e3a5f]">{issue.issueNo}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                            issue.status === 'RESOLVED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {issue.status === 'RESOLVED' ? 'Needs Verification' : 'Pending Update'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-900 truncate">{issue.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{issue.asset?.name || 'General Asset'}</p>
                      </div>
                      <Button size="sm" variant={issue.status === 'RESOLVED' ? 'default' : 'outline'} className="text-xs h-7 shrink-0">
                        {issue.status === 'RESOLVED' ? 'Verify' : 'Open'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* PM Tasks */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" /> My PM Maintenance Tasks ({userStats?.actionablePMs?.length || 0})
                </h3>
                <button onClick={() => navigate('/pm')} className="text-xs text-[#1e3a5f] font-semibold hover:underline">
                  View All
                </button>
              </div>

              <div className="space-y-2.5">
                {userStats?.actionablePMs?.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-6">No PM tasks scheduled for you right now.</p>
                ) : (
                  userStats?.actionablePMs?.map((pm: any) => {
                    const isOverdue = new Date(pm.dueDate) < new Date();
                    return (
                      <div
                        key={pm.id}
                        onClick={() => navigate('/pm')}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50/20 cursor-pointer flex justify-between items-center gap-3 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-medium text-gray-500">
                              Due: {new Date(pm.dueDate).toLocaleDateString()}
                            </span>
                            {isOverdue && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-gray-900 truncate">{pm.plan?.name}</p>
                        </div>
                        <Button size="sm" variant={isOverdue ? 'destructive' : 'default'} className="text-xs h-7 shrink-0">
                          Execute
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TECHNICIAN DASHBOARD ───────────────────────────────────────────── */}
      {role === 'TECHNICIAN' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            label="Active Service Jobs (My Assigned)"
            value={userStats?.myActiveJobs ?? 0}
            icon={<Wrench />}
            color="blue"
            onClick={() => navigate('/jobs')}
          />
          <StatsCard
            label="Completed Jobs Today"
            value={userStats?.myCompletedToday ?? 0}
            icon={<Activity />}
            color="green"
            onClick={() => navigate('/jobs?filter=completed')}
          />
        </div>
      )}

      {/* ── RECENT ISSUES STREAM (ADMIN / MANAGER) ─────────────────────────── */}
      {data?.recentIssues && data.recentIssues.length > 0 && isAdminRole && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">Recent Incident Tickets</h3>
            <button onClick={() => navigate('/issues')} className="text-xs text-[#1e3a5f] font-semibold hover:underline">
              View All Tickets →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentIssues.slice(0, 5).map((issue: any) => (
              <div
                key={issue.id}
                onClick={() => navigate(`/issues/${issue.id}`)}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-blue-50/40 px-2 rounded-lg transition-colors group"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold text-[#1e3a5f]">{issue.issueNo}</span>
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-xs text-gray-500 font-medium">{issue.branch?.name || issue.branch?.code}</span>
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-gray-900 truncate group-hover:text-[#1e3a5f] transition-colors">
                    {issue.title || issue.description?.slice(0, 60)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {issue.asset?.name ? `Asset: ${issue.asset.name}` : 'General'} • Raised by {issue.raisedBy?.name || 'Staff'}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  issue.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                  issue.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                  issue.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {issue.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
