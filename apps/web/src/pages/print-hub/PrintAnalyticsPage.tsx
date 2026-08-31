import React, { useState } from 'react';
import { usePrintHubAnalytics, usePrintOrders } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  BarChart3, IndianRupee, Printer, MessageSquare,
  CheckCircle2, Download, TrendingUp, Users, FileText,
  Calendar, Layers, Sparkles
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function PrintAnalyticsPage() {
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: analytics, isLoading } = usePrintHubAnalytics(selectedBranch || undefined);
  const { data: ordersResponse } = usePrintOrders({ branchId: selectedBranch || undefined, limit: 100 });

  const orders: any[] = ordersResponse?.data || [];
  const widgets = analytics?.widgets || {
    newWhatsAppOrders: 0,
    pendingPrintJobs: 0,
    readyForDelivery: 0,
    todayPrints: 0,
    todayDelivered: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    totalOrders: 0,
    bwPrints: 0,
    colorPrints: 0,
  };

  const branchPerformance = analytics?.branchPerformance || [];

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order No', 'Token', 'Customer', 'Phone', 'Source', 'Document', 'Color Mode', 'Pages', 'Copies', 'Amount (INR)', 'Status', 'Date'];
    const rows = orders.map((o: any) => [
      o.orderNo,
      o.tokenNumber,
      `"${o.customerName}"`,
      o.customerPhone,
      o.source,
      `"${o.documentName}"`,
      o.colorMode,
      o.pageCount,
      o.copies,
      o.totalAmount,
      o.status,
      new Date(o.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `print_orders_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-[#1e3a5f]" /> Print & WhatsApp Hub Analytics & Reports
          </h2>
          <p className="text-[11px] text-gray-500">Revenue intelligence, staff productivity, WhatsApp conversion, and branch print volume</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700"
          >
            <option value="">All Branches</option>
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="text-xs bg-white text-gray-700 border-gray-300 hover:bg-gray-50 h-8 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Export Orders CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* ── 5 Core Metric Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Today's Revenue */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <IndianRupee className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Today's Revenue</span>
              <div className="text-xl font-extrabold text-gray-900 font-mono">₹ {widgets.todayRevenue.toLocaleString('en-IN')}</div>
              <span className="text-[10px] text-gray-400">Total ₹{widgets.totalRevenue.toLocaleString('en-IN')}</span>
            </div>

            {/* 2. Today's Print Jobs */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <Printer className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Today's Print Jobs</span>
              <div className="text-xl font-extrabold text-gray-900 font-mono">{widgets.todayPrints}</div>
              <span className="text-[10px] text-gray-400">{widgets.todayDelivered} Delivered</span>
            </div>

            {/* 3. Pending Queue */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Pending Print Jobs</span>
              <div className="text-xl font-extrabold text-amber-700 font-mono">{widgets.pendingPrintJobs}</div>
              <span className="text-[10px] text-gray-400">In Active Queue</span>
            </div>

            {/* 4. Ready For Delivery */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-1">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">Ready For Delivery</span>
              <div className="text-xl font-extrabold text-teal-700 font-mono">{widgets.readyForDelivery}</div>
              <span className="text-[10px] text-gray-400">At Pickup Counter</span>
            </div>

            {/* 5. WhatsApp Orders */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 block">New WhatsApp Orders</span>
              <div className="text-xl font-extrabold text-emerald-700 font-mono">{widgets.newWhatsAppOrders}</div>
              <span className="text-[10px] text-gray-400">Bot Inbound Today</span>
            </div>
          </div>

          {/* ── Visual Charts & Branch Performance ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Branch Performance Comparison */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Branch Wise Print Volume & Revenue</h3>
              {branchPerformance.length > 0 ? (
                <div className="space-y-3 pt-2">
                  {branchPerformance.map((b: any) => (
                    <div key={b.branchId} className="space-y-1 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-800">{b.name} ({b.code})</span>
                        <span className="text-gray-500 font-mono">{b.totalOrders} jobs · ₹{b.revenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#1e3a5f] h-2 rounded-full"
                          style={{
                            width: `${widgets.totalRevenue > 0 ? (b.revenue / widgets.totalRevenue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8">No branch data available.</p>
              )}
            </div>

            {/* Print Color Mode Distribution */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-gray-900">Color vs B&W Print Distribution</h3>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center space-y-1">
                  <span className="text-xs font-bold text-gray-600 block uppercase">Black & White Pages</span>
                  <span className="text-2xl font-black font-mono text-gray-900">{widgets.bwPrints}</span>
                  <span className="text-[10px] text-gray-400 block">₹2 / page standard</span>
                </div>

                <div className="p-4 rounded-xl bg-pink-50 border border-pink-200 text-center space-y-1">
                  <span className="text-xs font-bold text-pink-700 block uppercase">Color Pages</span>
                  <span className="text-2xl font-black font-mono text-pink-900">{widgets.colorPrints}</span>
                  <span className="text-[10px] text-pink-500 block">₹10 / page premium</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
