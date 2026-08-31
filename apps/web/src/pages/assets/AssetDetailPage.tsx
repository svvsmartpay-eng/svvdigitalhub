import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAsset, useAssetHistory } from '@/api/assets.api';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box, IndianRupee, Activity, Calendar, Wrench, Shield,
  AlertTriangle, CheckCircle, Clock, AlertCircle, ArrowRight,
  TrendingDown, RefreshCw, QrCode, FileText, Check, Plus,
  Layers, MapPin, User, Tag, HardDrive, Cpu, DollarSign, Edit
} from 'lucide-react';

export default function AssetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'FINANCIAL' | 'LIFECYCLE' | 'SPECS' | 'TICKETS' | 'COSTS'>('FINANCIAL');
  const [isCalculatingHealth, setIsCalculatingHealth] = useState(false);

  const { data: asset, isLoading, isError, refetch } = useAsset(id!);
  const { data: timelineData, isLoading: timelineLoading } = useAssetHistory(id!);

  const handleRecalculateHealth = async () => {
    if (!asset?.id) return;
    setIsCalculatingHealth(true);
    try {
      await apiClient.post(`/assets/${asset.id}/calculate-health`);
      qc.invalidateQueries({ queryKey: ['asset', id] });
      qc.invalidateQueries({ queryKey: ['asset-history', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      alert('Failed to recalculate health score');
    } finally {
      setIsCalculatingHealth(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  if (isError || !asset) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Asset Not Found</h2>
        <p className="text-xs text-gray-500">The requested asset record could not be loaded.</p>
        <Link to="/assets"><Button variant="outline" size="sm">Back to Assets</Button></Link>
      </div>
    );
  }

  const financial = asset.financialSummary || {
    initialCapEx: Number(asset.purchaseCost || 0),
    totalMaintenanceCost: 0,
    costBreakdown: { labour: 0, parts: 0, travel: 0, other: 0, total: 0 },
    costToPurchaseRatio: 0,
    needsReplacement: false,
  };

  const healthScore = asset.healthScore ?? 85;
  const healthStatus = asset.healthStatus || 'HEALTHY';
  const latestHealthRecord = asset.healthScores?.[0];

  const getHealthBadgeColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'WATCH': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'AT_RISK': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const timelineEvents: any[] = Array.isArray(timelineData) ? timelineData : [];

  return (
    <div className="space-y-5 font-sans">
      {/* ── Top Header Strip ──────────────────────────────────────────────── */}
      <PageHeader
        title={asset.name}
        subtitle={`${asset.assetId} · ${asset.category?.name || 'General Category'} · Branch: ${asset.branch?.name} (${asset.branch?.code})`}
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          { label: asset.assetId },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/assets/${asset.id}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-2xs"
              >
                <Edit className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Edit Asset
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculateHealth}
              loading={isCalculatingHealth}
              className="text-xs font-semibold bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Recalculate Health
            </Button>
            <Link to={`/assets/${asset.assetId}/qr`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold bg-blue-50/80 border-blue-200 text-[#1e3a5f] hover:bg-blue-100/80 shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5 mr-1" /> View QR
              </Button>
            </Link>
            <Link to={`/issues/raise?assetId=${asset.id}`}>
              <Button size="sm" className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold shadow-2xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Raise Issue
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Key Status & Health Snapshot Bar ──────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <StatusBadge status={asset.status} size="sm" />
          </div>
          <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Condition:</span>
            <StatusBadge status={asset.condition} size="sm" />
          </div>
          <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Criticality:</span>
            <StatusBadge status={asset.criticality} size="sm" />
          </div>
        </div>

        {/* Dynamic Health Score Capsule */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-gray-400">Health Index</div>
            <div className="text-xs font-bold text-gray-800">{healthStatus.replace('_', ' ')}</div>
          </div>
          <div className={`px-3 py-1 rounded-lg border font-mono font-bold text-sm flex items-center gap-1.5 ${getHealthBadgeColor(healthStatus)}`}>
            <Activity className="w-4 h-4" />
            <span>{healthScore} / 100</span>
          </div>
        </div>
      </div>

      {/* ── Replacement Planning Banner (If Threshold Exceeded) ─────────────── */}
      {financial.needsReplacement && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl shadow-2xs border border-red-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Asset Replacement Action Required</h4>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                Cumulative maintenance spend of ₹{financial.totalMaintenanceCost.toLocaleString('en-IN')} has reached{' '}
                <strong>{financial.costToPurchaseRatio}%</strong> of original purchase cost (₹{Number(asset.purchaseCost || 0).toLocaleString('en-IN')}).
                Replacement is recommended over continued repair expenditures.
              </p>
            </div>
          </div>
          <Link to={`/reports`} className="shrink-0">
            <Button size="sm" className="h-8 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-2xs">
              View Replacement ROI Analysis
            </Button>
          </Link>
        </div>
      )}

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-2">
          {[
            { id: 'FINANCIAL', label: 'Financial & ROI Ledger', icon: <IndianRupee className="w-3.5 h-3.5 mr-1.5" /> },
            { id: 'LIFECYCLE', label: 'Lifecycle Timeline', icon: <Clock className="w-3.5 h-3.5 mr-1.5" /> },
            { id: 'SPECS', label: 'Identity & Location', icon: <Box className="w-3.5 h-3.5 mr-1.5" /> },
            { id: 'TICKETS', label: `Tickets & Repairs (${asset.issues?.length || 0})`, icon: <Wrench className="w-3.5 h-3.5 mr-1.5" /> },
            { id: 'COSTS', label: `Cost Entries (${asset.costEntries?.length || 0})`, icon: <DollarSign className="w-3.5 h-3.5 mr-1.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2.5 border-b-2 font-semibold text-xs transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1e3a5f] text-[#1e3a5f] bg-blue-50/40 rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: FINANCIAL ROI & LEDGER
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'FINANCIAL' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top 4 Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Purchase / CapEx</div>
              <div className="text-xl font-bold font-mono text-gray-900">
                ₹{Number(asset.purchaseCost || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-400">
                {asset.installationCost ? `+ ₹${Number(asset.installationCost).toLocaleString('en-IN')} install` : 'Original capitalization'}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Total Maintenance Spend</div>
              <div className="text-xl font-bold font-mono text-purple-900">
                ₹{financial.totalMaintenanceCost.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-400">
                Across {asset.costEntries?.length || 0} maintenance entries
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Maintenance vs CapEx Ratio</div>
              <div className="text-xl font-bold font-mono text-gray-900">
                {financial.costToPurchaseRatio}%
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    financial.costToPurchaseRatio > 50 ? 'bg-red-600' : financial.costToPurchaseRatio > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, financial.costToPurchaseRatio)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-1">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Book Value</div>
              <div className="text-xl font-bold font-mono text-gray-900">
                ₹{Number(asset.currentBookValue || asset.purchaseCost || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-400">
                Expected Life: {asset.expectedLifeYears || 5} years
              </div>
            </div>
          </div>

          {/* Detailed Cost Breakdown & Health Score Analysis Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cost Category Breakdown */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-[#1e3a5f]" /> Maintenance Expense Breakdown by Category
              </h3>

              <div className="space-y-3">
                {[
                  { label: 'Technician Labor & Service Charges', amount: financial.costBreakdown.labour, color: 'bg-blue-600' },
                  { label: 'Replacement Spare Parts Cost', amount: financial.costBreakdown.parts, color: 'bg-emerald-600' },
                  { label: 'Travel & Conveyance Expenses', amount: financial.costBreakdown.travel, color: 'bg-amber-500' },
                  { label: 'Incidental / Taxes / Other Expenses', amount: financial.costBreakdown.other, color: 'bg-gray-500' },
                ].map((cat, i) => {
                  const pct = financial.totalMaintenanceCost > 0
                    ? Math.round((cat.amount / financial.totalMaintenanceCost) * 100)
                    : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-700">{cat.label}</span>
                        <span className="font-mono text-gray-900 font-bold">
                          ₹{cat.amount.toLocaleString('en-IN')} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">Cumulative Lifecycle Maintenance Spend</span>
                <span className="font-mono font-bold text-sm text-[#1e3a5f]">
                  ₹{financial.totalMaintenanceCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Health Score Multi-Factor Evaluation */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1e3a5f]" /> Health Score Evaluation Engine
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getHealthBadgeColor(healthStatus)}`}>
                  {healthScore}/100 ({healthStatus})
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>1. Maintenance Cost to Purchase Ratio</span>
                    <span className="font-mono font-bold">{latestHealthRecord?.costScore ?? 26} / 30 pts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${((latestHealthRecord?.costScore ?? 26) / 30) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>2. Breakdown Frequency (90 Days)</span>
                    <span className="font-mono font-bold">{latestHealthRecord?.breakdownScore ?? 20} / 25 pts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${((latestHealthRecord?.breakdownScore ?? 20) / 25) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>3. Cumulative Out-of-Service Downtime</span>
                    <span className="font-mono font-bold">{latestHealthRecord?.downtimeScore ?? 18} / 20 pts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-amber-600 h-full rounded-full" style={{ width: `${((latestHealthRecord?.downtimeScore ?? 18) / 20) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>4. Asset Age vs Expected Lifespan</span>
                    <span className="font-mono font-bold">{latestHealthRecord?.ageScore ?? 12} / 15 pts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-purple-600 h-full rounded-full" style={{ width: `${((latestHealthRecord?.ageScore ?? 12) / 15) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>5. Physical Condition & Reliability</span>
                    <span className="font-mono font-bold">{latestHealthRecord?.conditionScore ?? 8} / 10 pts</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: `${((latestHealthRecord?.conditionScore ?? 8) / 10) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                Formula dynamically weighs cumulative expenses, repair frequency, and operating hours.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: UNIFIED LIFECYCLE TIMELINE
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'LIFECYCLE' && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-6 space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Complete Asset Lifecycle Timeline</h3>
              <p className="text-xs text-gray-500 mt-0.5">Chronological record of purchase, commissioning, PMs, breakdown repairs, and costs.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          {timelineLoading ? (
            <div className="p-8 text-center"><LoadingSpinner size="md" /></div>
          ) : timelineEvents.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No lifecycle events recorded for this asset yet.</p>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Dot */}
                  <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#1e3a5f] group-hover:scale-125 transition-transform" />

                  <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 space-y-1.5 hover:bg-white hover:shadow-2xs transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{evt.title}</span>
                        {evt.badge && (
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${evt.badgeColor || 'bg-gray-100 text-gray-700'}`}>
                            {evt.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-gray-400">
                        {new Date(evt.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    {evt.subtitle && (
                      <p className="text-xs font-medium text-[#1e3a5f]">{evt.subtitle}</p>
                    )}

                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{evt.description}</p>

                    {evt.amount && (
                      <div className="pt-1 text-xs font-mono font-bold text-gray-900">
                        Amount: ₹{evt.amount.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 3: IDENTITY & SPECS
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'SPECS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#1e3a5f]" /> Technical Identity & Hardware
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Brand</span><span className="font-medium">{asset.brand || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Model</span><span className="font-medium">{asset.model || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Serial Number</span><span className="font-mono font-medium">{asset.serialNumber || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Barcode / Tag</span><span className="font-mono font-medium">{asset.barcode || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Tracking Mode</span><span className="font-medium">{asset.trackingMode}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Quantity</span><span className="font-medium">{asset.quantity} {asset.unit || 'units'}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" /> Location & Custody
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Branch</span><span className="font-medium">{asset.branch?.name} ({asset.branch?.code})</span></div>
              <div><span className="text-gray-400 block text-[10px]">Building</span><span className="font-medium">{asset.building || 'Main Building'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Room / Area</span><span className="font-medium">{asset.room || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Position</span><span className="font-medium">{asset.exactPosition || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Custodian</span><span className="font-medium">{asset.custodianName || 'Branch Staff'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Ownership Model</span><span className="font-medium">{asset.ownershipType}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-700" /> Lifecycle & Lifespan Specs
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Purchase Date</span><span className="font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-IN') : '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Installation Date</span><span className="font-medium">{asset.installationDate ? new Date(asset.installationDate).toLocaleDateString('en-IN') : '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Expected Life Span</span><span className="font-medium">{asset.expectedLifeYears || 5} Years</span></div>
              <div><span className="text-gray-400 block text-[10px]">Commissioning Date</span><span className="font-medium">{asset.commissioningDate ? new Date(asset.commissioningDate).toLocaleDateString('en-IN') : '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Initial Purchase Cost</span><span className="font-mono font-medium">₹{Number(asset.purchaseCost || 0).toLocaleString('en-IN')}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Est. Replacement Cost</span><span className="font-mono font-medium">₹{Number(asset.replacementCost || asset.purchaseCost || 0).toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-3">
            <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-700" /> Warranty & AMC Protection
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-gray-400 block text-[10px]">Warranty Status</span><span className="font-medium">{asset.warranty?.endDate ? (new Date(asset.warranty.endDate) > new Date() ? '✅ Active' : '❌ Expired') : 'No Active Warranty'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">Warranty Valid Until</span><span className="font-medium">{asset.warranty?.endDate ? new Date(asset.warranty.endDate).toLocaleDateString('en-IN') : '—'}</span></div>
              <div className="col-span-2"><span className="text-gray-400 block text-[10px]">Warranty Terms</span><span className="font-medium text-gray-700">{asset.warranty?.terms || 'Standard OEM Manufacturer Terms'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">AMC Contract #</span><span className="font-mono font-medium">{asset.amc?.contractNo || '—'}</span></div>
              <div><span className="text-gray-400 block text-[10px]">AMC Annual Cost</span><span className="font-mono font-medium">{asset.amc?.cost ? `₹${Number(asset.amc.cost).toLocaleString('en-IN')}` : '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 4: TICKETS & REPAIRS
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'TICKETS' && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-900">Maintenance & Breakdown Tickets</h3>
            <Link to={`/issues/raise?assetId=${asset.id}`}>
              <Button size="sm" className="h-7 text-xs bg-[#1e3a5f] text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Raise Ticket
              </Button>
            </Link>
          </div>

          {asset.issues && asset.issues.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {asset.issues.map((iss: any) => (
                <div
                  key={iss.id}
                  onClick={() => navigate(`/issues/${iss.id}`)}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer rounded-lg px-2 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-xs text-[#1e3a5f]">{iss.issueNo}</span>
                      <StatusBadge status={iss.priority} size="sm" />
                      <StatusBadge status={iss.status} size="sm" />
                    </div>
                    <p className="font-semibold text-xs text-gray-900">{iss.title}</p>
                    <p className="text-[11px] text-gray-400">Raised: {new Date(iss.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No maintenance issues recorded for this asset.</p>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 5: COST ENTRIES LEDGER
      ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'COSTS' && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Asset Maintenance Cost Ledger</h3>
              <p className="text-xs text-gray-500">Every expenditure recorded automatically updates this ledger.</p>
            </div>
            <div className="text-right font-mono font-bold text-sm text-[#1e3a5f]">
              Total: ₹{financial.totalMaintenanceCost.toLocaleString('en-IN')}
            </div>
          </div>

          {asset.costEntries && asset.costEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {asset.costEntries.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 font-mono text-gray-600">
                        {new Date(c.recordedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 uppercase">
                          {c.categoryType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-900 font-medium">{c.description}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500">{c.invoiceNumber || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                        ₹{Number(c.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No cost entries logged for this asset yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
