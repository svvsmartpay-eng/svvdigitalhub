import React, { useState } from 'react';
import { useAdvertisements, useCreateAdvertisement } from '@/api/printHub.api';
import { useBranches } from '@/api/branches.api';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  Megaphone, Plus, Monitor, Play, Image as ImageIcon,
  ExternalLink, Eye, Clock, CheckCircle2, Sparkles
} from 'lucide-react';

export default function AdvertisementsPage() {
  const { data: branches } = useBranches();
  const [selectedBranch, setSelectedBranch] = useState('');
  const { data: ads, isLoading } = useAdvertisements(selectedBranch || undefined);

  const createAdMutation = useCreateAdvertisement();
  const [showNewAd, setShowNewAd] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [duration, setDuration] = useState(10);
  const [branchId, setBranchId] = useState('');
  const [placement, setPlacement] = useState('KIOSK_DISPLAY');

  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    createAdMutation.mutate(
      {
        branchId: branchId || undefined,
        title,
        description: desc,
        mediaUrl: mediaUrl || '/uploads/ad_banner.png',
        targetUrl,
        displayDurationSec: duration,
        placement,
      },
      {
        onSuccess: () => {
          setShowNewAd(false);
          setTitle('');
          setDesc('');
          setMediaUrl('');
          setTargetUrl('');
        },
      }
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-[#1e3a5f]" /> Branch Digital Signage & Advertisements
          </h2>
          <p className="text-[11px] text-gray-500">Manage banner slides, local offers, and sponsor promotions displayed on customer self-service kiosks and token screens</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNewAd(true)}
            className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold h-8"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> New Campaign Banner
          </Button>
        </div>
      </div>

      {/* ── Ads Grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-24 text-center"><LoadingSpinner size="lg" /></div>
      ) : (ads || []).length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200 text-xs text-gray-400 space-y-2">
          <Megaphone className="w-10 h-10 mx-auto text-gray-300" />
          <p className="font-semibold text-gray-700">No active advertisement banners</p>
          <p className="text-[11px]">Upload promotional offers to display on customer kiosks and waiting screens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(ads || []).map((ad: any) => (
            <div key={ad.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs space-y-3 p-4">
              <div className="h-36 rounded-lg bg-gradient-to-br from-blue-900 to-indigo-800 text-white flex flex-col justify-between p-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 uppercase tracking-wider backdrop-blur-xs">
                    {ad.placement}
                  </span>
                  <span className="text-[10px] font-mono flex items-center gap-1 opacity-80">
                    <Clock className="w-3 h-3" /> {ad.displayDurationSec}s
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-snug">{ad.title}</h3>
                  {ad.description && <p className="text-[11px] opacity-80 line-clamp-1">{ad.description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 text-[11px]">
                  Target: {ad.branch?.name || 'All Branches'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── New Ad Modal ────────────────────────────────────────────────────── */}
      {showNewAd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-[#1e3a5f] font-bold text-sm">
                <Megaphone className="w-4 h-4" /> Create Digital Ad Campaign
              </div>
              <button onClick={() => setShowNewAd(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateAd} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  placeholder="e.g. Special Offer: 20% Off Color Photo Prints"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Description / Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. High glossy A4 print on premium paper"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Target Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                  >
                    <option value="">All Branches</option>
                    {branches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Screen Placement</label>
                <select
                  value={placement}
                  onChange={(e) => setPlacement(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                >
                  <option value="KIOSK_DISPLAY">Customer Kiosk Touchscreen (Banner)</option>
                  <option value="TOKEN_SCREEN">Waiting Area TV / Token Screen</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowNewAd(false)}>Cancel</Button>
                <Button
                  size="sm"
                  type="submit"
                  loading={createAdMutation.isPending}
                  className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold px-4"
                >
                  <Megaphone className="w-3.5 h-3.5 mr-1" /> Publish Banner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
