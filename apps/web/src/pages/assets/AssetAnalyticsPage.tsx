import React, { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAssetAnalytics } from '@/api/assets.api';
import { useBranches } from '@/api/branches.api';
import { useCategories } from '@/api/categories.api';
import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  Box, IndianRupee, TrendingDown, TrendingUp, AlertTriangle,
  Shield, Calendar, Wrench, ChevronRight, Download, Filter,
  RotateCcw, AlertCircle, Building2, HardDrive, Cpu, DollarSign,
  Activity, ArrowUpRight, CheckCircle2, Info, FileSpreadsheet,
  FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AssetAnalyticsPage() {
  const { user } = useAuthStore();
  const role = user?.primaryRole || 'STAFF';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  // Access Control Guard
  if (!isAdmin) {
    return (
      <div className="p-12 text-center space-y-3">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Asset Financial Analytics and Business Intelligence are restricted to Administrators only.
        </p>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="mt-2">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Filters State
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState('');
  const [selectedAMC, setSelectedAMC] = useState('');
  const [dateRange, setDateRange] = useState('01 Apr 2026 - 28 Apr 2026');

  // Applied filter state for query
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  const { data: branches } = useBranches();
  const { data: categories } = useCategories();
  const { data: analytics, isLoading, isError, error, refetch } = useAssetAnalytics(appliedFilters);

  const handleApplyFilters = () => {
    setAppliedFilters({
      branchId: selectedBranch || undefined,
      categoryId: selectedCategory || undefined,
      status: selectedStatus || undefined,
      condition: selectedCondition || undefined,
      warrantyStatus: selectedWarranty || undefined,
      amcStatus: selectedAMC || undefined,
    });
  };

  const handleResetFilters = () => {
    setSelectedBranch('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedCondition('');
    setSelectedWarranty('');
    setSelectedAMC('');
    setAppliedFilters({});
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const summary = analytics.summary;
    const rows = [
      ['Metric', 'Value'],
      ['Total Assets', summary.totalAssets],
      ['Total Purchase Value (INR)', summary.totalPurchaseValue],
      ['Current Asset Value (INR)', summary.currentAssetValue],
      ['Depreciated Value (INR)', summary.depreciatedValue],
      ['Assets Under Maintenance', summary.underMaintenanceCount],
      ['Damaged Assets', summary.damagedCount],
      ['Warranty Expiring in 30 Days', summary.warrantyExpiring30Count],
      ['AMC Expiring in 30 Days', summary.amcExpiring30Count],
      ['This Year Purchase (INR)', summary.thisYearPurchase],
      ['This Year Maintenance Cost (INR)', summary.thisYearMaintenanceCost],
      ['This Year Repair Cost (INR)', summary.thisYearRepairCost],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `asset_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = analytics?.summary || {
    totalAssets: 0,
    totalPurchaseValue: 0,
    currentAssetValue: 0,
    depreciatedValue: 0,
    underMaintenanceCount: 0,
    underMaintenancePercent: 0,
    damagedCount: 0,
    damagedPercent: 0,
    scrapCount: 0,
    warrantyExpiring30Count: 0,
    amcExpiring30Count: 0,
    amcActiveCount: 0,
    amcActivePercent: 0,
    serviceDueCount: 0,
    thisYearPurchase: 0,
    thisYearMaintenanceCost: 0,
    thisYearRepairCost: 0,
  };

  const assetsByBranch = analytics?.assetsByBranch || [];
  const assetsByCategory = analytics?.assetsByCategory || [];
  const assetsByCondition = analytics?.assetsByCondition || [];
  const topMaintenanceCostAssets = analytics?.topMaintenanceCostAssets || [];
  const alerts = analytics?.alerts || {
    warrantyExpiring30: 0,
    amcExpiring30: 0,
    assetsUnderMaintenance: 0,
    serviceDue: 0,
    highRepairCostAssets: 0,
  };

  // Recharts colors for category chart
  const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-5 font-sans pb-16 max-w-[1600px] mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Asset Management Analytics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#1e3a5f] border border-blue-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Admin Business Intelligence & Asset Valuation Dashboard</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium font-mono">{dateRange}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-2xs h-8"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Export
          </Button>
        </div>
      </div>

      {/* ── Advanced Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Branch */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All Branches</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All Categories</option>
              {categories?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Equipment Type */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Equipment Type</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All Types</option>
              <option value="INDIVIDUAL">Individual (Serial)</option>
              <option value="QUANTITY">Batch / Bulk</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All Status</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Condition</label>
            <select
              value={selectedCondition}
              onChange={e => setSelectedCondition(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All Condition</option>
              <option value="GOOD">Good / New</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="CRITICAL">Critical</option>
              <option value="SCRAP">Scrap</option>
            </select>
          </div>

          {/* Warranty Status */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Warranty Status</label>
            <select
              value={selectedWarranty}
              onChange={e => setSelectedWarranty(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_30">Expiring in 30 Days</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          {/* AMC Status */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">AMC Status</label>
            <select
              value={selectedAMC}
              onChange={e => setSelectedAMC(e.target.value)}
              className="w-full h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-medium text-gray-700"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_30">Expiring in 30 Days</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-2 pt-2 border-t border-gray-100">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetFilters}
            className="text-xs text-gray-500 hover:text-gray-700 h-8"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={handleApplyFilters}
            className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-8 px-4"
          >
            <Filter className="w-3 h-3 mr-1.5" /> Apply Filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : isError ? (
        <div className="p-12 text-center bg-white rounded-xl border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="font-bold text-sm text-red-800">Failed to calculate asset analytics</p>
          <p className="text-xs text-red-500 mt-1">{(error as any)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">Retry</Button>
        </div>
      ) : (
        <>
          {/* ── Row 1: 7 KPI Summary Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* 1. Total Assets */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <Box className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Total Assets</span>
              <div className="text-xl font-extrabold text-gray-900 font-mono">{summary.totalAssets}</div>
              <span className="text-[10px] text-gray-400">100% All Assets</span>
            </div>

            {/* 2. Total Asset Value */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <IndianRupee className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Total Asset Value</span>
              <div className="text-lg font-extrabold text-gray-900 font-mono truncate" title={`₹${summary.totalPurchaseValue.toLocaleString('en-IN')}`}>
                ₹ {summary.totalPurchaseValue.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-gray-400">Purchase Value</span>
            </div>

            {/* 3. Current Asset Value */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1e3a5f] flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Current Asset Value</span>
              <div className="text-lg font-extrabold text-gray-900 font-mono truncate" title={`₹${summary.currentAssetValue.toLocaleString('en-IN')}`}>
                ₹ {summary.currentAssetValue.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-gray-400">Current Book Value</span>
            </div>

            {/* 4. Under Maintenance */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Under Maintenance</span>
              <div className="text-xl font-extrabold text-amber-700 font-mono">{summary.underMaintenanceCount}</div>
              <span className="text-[10px] text-gray-400">{summary.underMaintenancePercent}% of Total</span>
            </div>

            {/* 5. Damaged Assets */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-1">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Damaged Assets</span>
              <div className="text-xl font-extrabold text-red-600 font-mono">{summary.damagedCount}</div>
              <span className="text-[10px] text-gray-400">{summary.damagedPercent}% of Total</span>
            </div>

            {/* 6. Warranty Expiring */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Warranty Expiring</span>
              <div className="text-xl font-extrabold text-purple-700 font-mono">{summary.warrantyExpiring30Count}</div>
              <span className="text-[10px] text-gray-400">Within 30 Days</span>
            </div>

            {/* 7. AMC Expiring */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-1">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">AMC Expiring</span>
              <div className="text-xl font-extrabold text-teal-700 font-mono">{summary.amcExpiring30Count}</div>
              <span className="text-[10px] text-gray-400">Within 30 Days</span>
            </div>
          </div>

          {/* ── Row 2: 4 Visual Analytics Panels ───────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Panel 1: Assets by Branch */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-gray-900">Assets by Branch</h3>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Count</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Value (₹)</span>
                </div>
              </div>

              {assetsByBranch.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {assetsByBranch.map((b: any) => (
                    <div key={b.branchId} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-800">{b.name}</span>
                        <span className="text-gray-500 font-mono">{b.assetCount} units · ₹{b.assetValue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-blue-600 h-2 rounded-l-full"
                          style={{ width: `${summary.totalAssets > 0 ? (b.assetCount / summary.totalAssets) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-emerald-500 h-2 rounded-r-full"
                          style={{ width: `${summary.totalPurchaseValue > 0 ? (b.assetValue / summary.totalPurchaseValue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No branch data available.</p>
              )}
            </div>

            {/* Panel 2: Assets by Category */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-xs text-gray-900">Assets by Category</h3>
              {assetsByCategory.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByCategory}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                        >
                          {assetsByCategory.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1 max-h-32 overflow-y-auto pr-1">
                    {assetsByCategory.map((c: any, idx: number) => (
                      <div key={c.categoryId} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 truncate text-gray-700">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="font-mono text-gray-500 font-semibold">{c.count} ({c.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No category data.</p>
              )}
            </div>

            {/* Panel 3: Assets by Condition */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-xs text-gray-900">Assets by Condition</h3>
              {assetsByCondition.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByCondition}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                        >
                          {assetsByCondition.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1">
                    {assetsByCondition.map((cond: any) => (
                      <div key={cond.key} className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cond.color }} />
                          <span>{cond.name}</span>
                        </span>
                        <span className="font-mono text-gray-500 font-semibold">{cond.count} ({cond.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No condition data.</p>
              )}
            </div>

            {/* Panel 4: Asset Value Summary */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Asset Value Summary</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-blue-600" /> Purchase Value
                  </span>
                  <span className="font-mono font-bold text-gray-900">₹ {summary.totalPurchaseValue.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Current Value
                  </span>
                  <span className="font-mono font-bold text-indigo-700">₹ {summary.currentAssetValue.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Depreciated Value
                  </span>
                  <span className="font-mono font-bold text-red-600">₹ {summary.depreciatedValue.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> This Year Purchase
                  </span>
                  <span className="font-mono font-bold text-gray-900">₹ {summary.thisYearPurchase.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" /> This Year Maintenance
                  </span>
                  <span className="font-mono font-bold text-amber-800">₹ {summary.thisYearMaintenanceCost.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-600" /> This Year Repair Cost
                  </span>
                  <span className="font-mono font-bold text-purple-800">₹ {summary.thisYearRepairCost.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 3: Bottom Insights & Alerts ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. Maintenance & AMC Overview */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Maintenance & AMC Overview</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Wrench className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Under Maintenance</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900">{summary.underMaintenanceCount}</div>
                  <span className="text-[10px] text-gray-500">{summary.underMaintenancePercent}%</span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">AMC Active</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900">{summary.amcActiveCount}</div>
                  <span className="text-[10px] text-gray-500">{summary.amcActivePercent}%</span>
                </div>

                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">AMC Expiring</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900">{summary.amcExpiring30Count}</div>
                  <span className="text-[10px] text-gray-500">Within 30 Days</span>
                </div>

                <div className="p-3 rounded-lg bg-red-50/60 border border-red-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">Service Due</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900">{summary.serviceDueCount}</div>
                  <span className="text-[10px] text-gray-500">Active Tickets</span>
                </div>
              </div>
            </div>

            {/* 2. Top Maintenance Cost Assets */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Top Maintenance Cost Assets</h3>
              {topMaintenanceCostAssets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-[10px] uppercase">
                        <th className="pb-1.5">Asset ID</th>
                        <th className="pb-1.5">Asset Name</th>
                        <th className="pb-1.5">Branch</th>
                        <th className="pb-1.5 text-right">Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topMaintenanceCostAssets.slice(0, 5).map((a: any) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="py-2 font-mono font-bold text-[#1e3a5f]">
                            <Link to={`/assets/${a.id}`} className="hover:underline">{a.assetId}</Link>
                          </td>
                          <td className="py-2 font-medium text-gray-900 truncate max-w-[110px]">{a.name}</td>
                          <td className="py-2 text-gray-500">{a.branch}</td>
                          <td className="py-2 text-right font-mono font-bold text-gray-900">₹{a.maintenanceCost.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No maintenance cost logs recorded.</p>
              )}
            </div>

            {/* 3. Asset Alerts */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Asset Risk & Lifecycle Alerts</h3>
              <div className="space-y-2 text-xs">
                <Link to="/assets?warranty=EXPIRING_30" className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 hover:bg-red-50 border border-red-100 transition-colors">
                  <span className="flex items-center gap-2 text-red-900 font-medium">
                    <Shield className="w-3.5 h-3.5 text-red-600" /> Warranty Expiring Within 30 Days
                  </span>
                  <span className="font-bold text-red-700 flex items-center gap-1 font-mono">
                    {alerts.warrantyExpiring30} <ChevronRight className="w-3 h-3 text-red-400" />
                  </span>
                </Link>

                <Link to="/assets?amc=EXPIRING_30" className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 hover:bg-amber-50 border border-amber-100 transition-colors">
                  <span className="flex items-center gap-2 text-amber-900 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" /> AMC Expiring Within 30 Days
                  </span>
                  <span className="font-bold text-amber-700 flex items-center gap-1 font-mono">
                    {alerts.amcExpiring30} <ChevronRight className="w-3 h-3 text-amber-400" />
                  </span>
                </Link>

                <Link to="/assets?status=UNDER_MAINTENANCE" className="flex items-center justify-between p-2 rounded-lg bg-yellow-50/50 hover:bg-yellow-50 border border-yellow-100 transition-colors">
                  <span className="flex items-center gap-2 text-yellow-900 font-medium">
                    <Wrench className="w-3.5 h-3.5 text-yellow-600" /> Assets Under Maintenance
                  </span>
                  <span className="font-bold text-yellow-700 flex items-center gap-1 font-mono">
                    {alerts.assetsUnderMaintenance} <ChevronRight className="w-3 h-3 text-yellow-400" />
                  </span>
                </Link>

                <Link to="/issues?status=OPEN" className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 transition-colors">
                  <span className="flex items-center gap-2 text-indigo-900 font-medium">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" /> Service Due / Active Issues
                  </span>
                  <span className="font-bold text-indigo-700 flex items-center gap-1 font-mono">
                    {alerts.serviceDue} <ChevronRight className="w-3 h-3 text-indigo-400" />
                  </span>
                </Link>

                <Link to="/costs" className="flex items-center justify-between p-2 rounded-lg bg-purple-50/50 hover:bg-purple-50 border border-purple-100 transition-colors">
                  <span className="flex items-center gap-2 text-purple-900 font-medium">
                    <IndianRupee className="w-3.5 h-3.5 text-purple-600" /> High Maintenance Cost Assets
                  </span>
                  <span className="font-bold text-purple-700 flex items-center gap-1 font-mono">
                    {alerts.highRepairCostAssets} <ChevronRight className="w-3 h-3 text-purple-400" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Bottom Admin Security Notice ───────────────────────────────────── */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-[#1e3a5f]">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Note:</strong> Asset Analytics, Depreciation, and Financial valuation data are visible to <strong>Administrators only</strong>. This data is not accessible to Branch Managers or Staff.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
