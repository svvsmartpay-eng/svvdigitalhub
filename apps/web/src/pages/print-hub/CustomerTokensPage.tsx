import React, { useState } from 'react';
import { useTokensBoard } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  Ticket, Volume2, Maximize2, Monitor, CheckCircle2,
  Clock, Play, BellRing, Sparkles
} from 'lucide-react';

export default function CustomerTokensPage() {
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: tokens, isLoading } = useTokensBoard(selectedBranch || undefined);

  const [isTvMode, setIsTvMode] = useState(false);

  const printingList = tokens?.printing || [];
  const readyList = tokens?.readyForDelivery || [];
  const queueList = tokens?.pendingQueue || [];

  return (
    <div className={`space-y-4 ${isTvMode ? 'fixed inset-0 bg-[#0f172a] text-white z-50 p-6 overflow-auto' : ''}`}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl border shadow-2xs ${
        isTvMode ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-gray-200'
      }`}>
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-500" />
            <span>Branch Live Token Display Board</span>
            {isTvMode && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                ● LIVE TV SCREEN MODE
              </span>
            )}
          </h2>
          <p className="text-xs opacity-75">Real-time status display for customer waiting area & collection counters</p>
        </div>

        <div className="flex items-center gap-2">
          {!isTvMode && (
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
          )}

          <Button
            size="sm"
            onClick={() => setIsTvMode(!isTvMode)}
            className={`${isTvMode ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e3a5f] hover:bg-[#172d4a]'} text-white text-xs font-semibold h-8`}
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> {isTvMode ? 'Exit TV Mode' : 'Open Fullscreen TV Mode'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ── Ready for Pick-Up (Green Large Board) ─────────────────────────── */}
          <div className={`p-6 rounded-2xl border-2 shadow-lg space-y-4 ${
            isTvMode ? 'bg-emerald-950/40 border-emerald-500/80 text-white' : 'bg-emerald-50/60 border-emerald-400 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b border-emerald-300/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-lg font-black tracking-wide uppercase text-emerald-600">
                  Ready For Pick-Up / Collection
                </h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {readyList.length} Token{readyList.length === 1 ? '' : 's'}
              </span>
            </div>

            {readyList.length === 0 ? (
              <div className="py-12 text-center text-xs opacity-50 space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400/50" />
                <p className="font-bold">No orders awaiting collection</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {readyList.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white text-gray-900 border border-emerald-300 shadow-md text-center space-y-1 transform hover:scale-105 transition-all"
                  >
                    <span className="text-3xl font-black font-mono text-emerald-700 block tracking-tight">
                      {item.tokenNumber}
                    </span>
                    <p className="text-xs font-bold truncate">{item.customerName}</p>
                    <span className="text-[10px] text-gray-400 font-mono block">{item.branch?.code || 'SVV'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Currently Printing / In Progress (Blue Board) ──────────────────── */}
          <div className={`p-6 rounded-2xl border-2 shadow-lg space-y-4 ${
            isTvMode ? 'bg-blue-950/40 border-blue-500/80 text-white' : 'bg-blue-50/60 border-blue-400 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b border-blue-300/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-lg font-black tracking-wide uppercase text-blue-600">
                  Now Printing / In Progress
                </h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                {printingList.length} Printing
              </span>
            </div>

            {printingList.length === 0 ? (
              <div className="py-12 text-center text-xs opacity-50 space-y-2">
                <Play className="w-12 h-12 mx-auto text-blue-400/50" />
                <p className="font-bold">No jobs currently on printer</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {printingList.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white text-gray-900 border border-blue-300 shadow-md text-center space-y-1 transform hover:scale-105 transition-all"
                  >
                    <span className="text-3xl font-black font-mono text-blue-700 block tracking-tight animate-pulse">
                      {item.tokenNumber}
                    </span>
                    <p className="text-xs font-bold truncate">{item.customerName}</p>
                    <span className="text-[10px] text-gray-400 font-mono block">Printing ({item.colorMode})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
