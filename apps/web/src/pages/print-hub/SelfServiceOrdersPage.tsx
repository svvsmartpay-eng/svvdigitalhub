import React, { useState } from 'react';
import { usePrintOrders, useCreatePrintOrder } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  Monitor, QrCode, Phone, CheckCircle2,
  FileText, ArrowRight, ShieldCheck, Ticket,
  IndianRupee, Sparkles, Plus, Clock
} from 'lucide-react';

export default function SelfServiceOrdersPage() {
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: response, isLoading } = usePrintOrders({
    branchId: selectedBranch || undefined,
    source: 'SELF_SERVICE_KIOSK',
  });

  const orders: any[] = response?.data || [];
  const createOrderMutation = useCreatePrintOrder();

  const [showKioskModal, setShowKioskModal] = useState(false);
  const [kioskCustName, setKioskCustName] = useState('');
  const [kioskPhone, setKioskPhone] = useState('');
  const [kioskDoc, setKioskDoc] = useState('');
  const [kioskPages, setKioskPages] = useState(1);
  const [kioskBranch, setKioskBranch] = useState(branches?.[0]?.id || '');

  const handleSimulateKiosk = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate(
      {
        branchId: kioskBranch || branches?.[0]?.id,
        customerName: kioskCustName,
        customerPhone: kioskPhone,
        source: 'SELF_SERVICE_KIOSK',
        documentUrl: '/uploads/kiosk_doc.pdf',
        documentName: kioskDoc || 'Self_Service_Document.pdf',
        pageCount: kioskPages,
        copies: 1,
        colorMode: 'BW',
        isPaid: true,
        paymentMode: 'UPI',
      },
      {
        onSuccess: () => {
          setShowKioskModal(false);
          setKioskCustName('');
          setKioskPhone('');
          setKioskDoc('');
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Monitor className="w-4 h-4 text-[#1e3a5f]" /> Branch Self-Service Kiosk Orders
          </h2>
          <p className="text-[11px] text-gray-500">Orders submitted by walk-in customers at branch touchscreen print terminals & payment kiosks</p>
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
            onClick={() => setShowKioskModal(true)}
            className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Simulate Kiosk Upload
          </Button>
        </div>
      </div>

      {/* ── Kiosk Orders Stream ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center"><LoadingSpinner size="md" /></div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400 space-y-2">
            <Monitor className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700">No self-service kiosk orders yet</p>
            <p className="text-[11px]">Customers uploading files at branch tablets/kiosks will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-3.5 py-3">Token & Order #</th>
                  <th className="px-3.5 py-3">Customer</th>
                  <th className="px-3.5 py-3">Document</th>
                  <th className="px-3.5 py-3">Payment</th>
                  <th className="px-3.5 py-3">Branch</th>
                  <th className="px-3.5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 mr-2">
                        {order.tokenNumber}
                      </span>
                      <span className="font-mono text-gray-600 font-medium">{order.orderNo}</span>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <p className="font-bold text-gray-900">{order.customerName}</p>
                      <p className="text-[11px] font-mono text-gray-500">{order.customerPhone}</p>
                    </td>
                    <td className="px-3.5 py-3 truncate max-w-[180px]">
                      <div className="flex items-center gap-1 text-gray-800 font-medium truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{order.documentName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{order.pageCount} pgs · {order.colorMode}</span>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> UPI Paid (₹{order.totalAmount})
                      </span>
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap text-gray-600">
                      {order.branch?.name || 'Main'}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Simulate Kiosk Modal ─────────────────────────────────────────────── */}
      {showKioskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <Monitor className="w-4 h-4" /> Simulate Kiosk Upload & Instant UPI Payment
              </div>
              <button onClick={() => setShowKioskModal(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleSimulateKiosk} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Branch Terminal</label>
                <select
                  value={kioskBranch}
                  onChange={(e) => setKioskBranch(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                >
                  {branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sravanthi"
                  value={kioskCustName}
                  onChange={(e) => setKioskCustName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Mobile #</label>
                <input
                  type="text"
                  placeholder="+91 9123456789"
                  value={kioskPhone}
                  onChange={(e) => setKioskPhone(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Document Name</label>
                <input
                  type="text"
                  placeholder="e.g. Resume_Final.pdf"
                  value={kioskDoc}
                  onChange={(e) => setKioskDoc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowKioskModal(false)}>Cancel</Button>
                <Button
                  size="sm"
                  type="submit"
                  loading={createOrderMutation.isPending}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-4"
                >
                  <Ticket className="w-3.5 h-3.5 mr-1" /> Submit & Issue Token
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
