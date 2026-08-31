import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePortalTicket, useSubmitPortalUpdate } from '@/api/portal.api';
import { mediaUrl } from '@/lib/media';
import {
  Wrench, ShieldCheck, CheckCircle2, AlertTriangle, Clock,
  Camera, Plus, Trash2, Send, Building2, Box, Phone,
  FileText, Check, X, ChevronRight, AlertCircle, ArrowLeft,
  MapPin, Mic, MicOff, Navigation, Sparkles, User, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function TechnicianPortalPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError, error } = usePortalTicket(token || '');
  const submitMutation = useSubmitPortalUpdate(token || '');

  // Form State
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<'IN_PROGRESS' | 'RESOLVED' | 'WAITING_FOR_PARTS'>('RESOLVED');
  const [diagnosisNote, setDiagnosisNote] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [remarks, setRemarks] = useState('');

  // GPS Location State
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Voice Dictation States
  const [activeMicField, setActiveMicField] = useState<'actions' | 'diagnosis' | 'remarks' | null>(null);
  const recognitionRef = useRef<any>(null);

  // Checklist State
  const [checklist, setChecklist] = useState<Array<{ id: string; label: string; status: string }>>([]);

  // Parts Used State (Quantities only, no charges)
  const [parts, setParts] = useState<Array<{ name: string; quantity: number }>>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);

  // Photos State
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission State
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-detect GPS Location on load
  useEffect(() => {
    handleDetectLocation();
  }, []);

  // Initialize checklist when ticket data loads
  useEffect(() => {
    if (data?.defaultChecklist && checklist.length === 0) {
      setChecklist(data.defaultChecklist);
    }
  }, [data]);

  // GPS Location Handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('GPS not supported on this browser');
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocating(false);
      },
      (err) => {
        setLocationError('Please enable GPS/location permissions on your device.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Voice to Text (Speech Recognition)
  const toggleVoiceDictation = (field: 'actions' | 'diagnosis' | 'remarks') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by this browser. You can use your mobile keyboard microphone.');
      return;
    }

    if (activeMicField === field) {
      recognitionRef.current?.stop();
      setActiveMicField(null);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English / Global English

      recognition.onstart = () => setActiveMicField(field);
      recognition.onend = () => setActiveMicField(null);
      recognition.onerror = () => setActiveMicField(null);

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          if (field === 'actions') {
            setActionsTaken(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          } else if (field === 'diagnosis') {
            setDiagnosisNote(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          } else if (field === 'remarks') {
            setRemarks(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setActiveMicField(null);
    }
  };

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setPhotos(prev => [...prev, ...selectedFiles]);

    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Checklist Toggle
  const handleToggleChecklistItem = (index: number, newStatus: string) => {
    setChecklist(prev =>
      prev.map((item, i) => (i === index ? { ...item, status: newStatus } : item))
    );
  };

  // Add Part
  const handleAddPart = () => {
    if (!newPartName.trim()) return;
    setParts(prev => [
      ...prev,
      {
        name: newPartName.trim(),
        quantity: Number(newPartQty) || 1,
      },
    ]);
    setNewPartName('');
    setNewPartQty(1);
  };

  const handleRemovePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) {
      alert('Please enter your Technician Name');
      return;
    }
    if (!actionsTaken.trim() && status === 'RESOLVED') {
      alert('Please specify what work was done (Actions Taken) to resolve this issue.');
      return;
    }

    submitMutation.mutate(
      {
        techName: techName.trim(),
        techPhone: techPhone.trim() || undefined,
        company: company.trim() || undefined,
        status,
        diagnosisNote: diagnosisNote.trim() || undefined,
        actionsTaken: actionsTaken.trim() || undefined,
        checklist,
        partsUsed: parts,
        location: location || undefined,
        remarks: remarks.trim() || undefined,
        photos,
      },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-semibold text-slate-600 mt-3">Loading technician service ticket...</p>
      </div>
    );
  }

  if (isError || !data?.issue) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-red-100 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Invalid or Expired QR Link</h2>
          <p className="text-xs text-slate-500 mb-6">
            This technician service QR code is either expired, invalid, or has already been completed. Please contact the SVV Branch Manager for a new access link.
          </p>
          <div className="text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
            Token: {token?.substring(0, 12)}...
          </div>
        </div>
      </div>
    );
  }

  const { issue, asset, branch } = data;

  // Render Confirmation Screen
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-emerald-100 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Service Report Logged!</h2>
          <p className="text-xs font-mono font-bold text-[#1e3a5f] mb-3">Ticket #{issue.issueNo}</p>
          
          <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 mb-6 border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Technician:</span>
              <span className="font-semibold text-slate-800">{techName} ({company || 'Technician'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Work Status:</span>
              <span className="font-bold text-emerald-700">{status}</span>
            </div>
            {location && (
              <div className="flex justify-between">
                <span className="text-slate-500">GPS Verified:</span>
                <span className="font-semibold text-blue-700 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600" /> {location.lat}, {location.lng}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Next Step:</span>
              <span className="font-semibold text-amber-700">Manager Verification</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4">
            Your work summary, checklist, GPS location, and photos have been synced to the main SVV AMS ticket timeline.
          </p>

          <Button
            onClick={() => setIsSubmitted(false)}
            variant="outline"
            className="w-full text-xs font-semibold"
          >
            Submit Another Update
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      {/* ── Brand Top Bar ─────────────────────────────────────────────────── */}
      <header className="bg-[#1e3a5f] text-white px-4 py-3 sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10">
              <Wrench className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">SVV AMS Technician Portal</h1>
              <p className="text-[10px] text-blue-200">Secure Service Token Access</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified QR</span>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 1. Ticket & Asset Overview Banner */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#1e3a5f] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {issue.issueNo}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">{branch?.name} ({branch?.code})</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1">{issue.title}</h2>
            </div>
            <StatusBadge status={issue.priority} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Asset Name</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-[#1e3a5f]" /> {asset?.name || 'Facility Unit'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Model / Serial</span>
              <span className="font-mono text-slate-700">
                {asset?.model || '—'} {asset?.serialNumber ? `(${asset.serialNumber})` : ''}
              </span>
            </div>
            {asset?.location && (
              <div className="col-span-2 pt-1 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Asset Location</span>
                <span className="text-slate-700">
                  {asset.location.building ? `${asset.location.building}, ` : ''}{asset.location.name}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
            <strong className="text-amber-900 block mb-0.5">Reported Issue Description:</strong>
            {issue.description}
          </div>

          {/* GPS Location Status Bar */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <MapPin className={`w-4 h-4 ${location ? 'text-emerald-600' : 'text-amber-500'}`} />
              <div>
                <span className="font-semibold text-slate-800 block">
                  {location ? 'Technician GPS Location Captured' : 'GPS Location Required'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {location ? `Lat: ${location.lat}, Lng: ${location.lng} (Accuracy ±${location.accuracy}m)` : (locationError || 'Detecting GPS coordinates...')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="text-[11px] font-semibold text-[#1e3a5f] bg-white border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-1"
            >
              <Navigation className="w-3 h-3 text-[#1e3a5f]" />
              {isLocating ? 'Locating...' : 'Refresh GPS'}
            </button>
          </div>
        </div>

        {/* ── Form Section ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Technician Identity */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">1</span>
              Technician Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technician Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={techName}
                  onChange={e => setTechName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <Input
                  placeholder="e.g. +91 9876543210"
                  value={techPhone}
                  onChange={e => setTechPhone(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Vendor / Agency</label>
                <Input
                  placeholder="e.g. Hitachi Payment Services / Voltas / Field Partner"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Work Done & Fault Diagnosis (With Voice Dictation Mic) */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">2</span>
              Work Performed & Fault Diagnosis
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Current Work Status</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatus('RESOLVED')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    status === 'RESOLVED'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
                  Issue Resolved
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('IN_PROGRESS')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    status === 'IN_PROGRESS'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-1" />
                  In Progress
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('WAITING_FOR_PARTS')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    status === 'WAITING_FOR_PARTS'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Wrench className="w-4 h-4 mx-auto mb-1" />
                  Needs Parts
                </button>
              </div>
            </div>

            {/* What He Did / Actions Taken (With Mic) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  What Did You Do? (Work Summary & Actions Taken) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('actions')}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    activeMicField === 'actions'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-100 text-[#1e3a5f] hover:bg-blue-100'
                  }`}
                  title="Voice to Text"
                >
                  {activeMicField === 'actions' ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#1e3a5f]" />}
                  <span>{activeMicField === 'actions' ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Describe step-by-step what actions you performed (e.g. Replaced RJ45 connector, rerouted cable, cleaned thermal paste, rebooted system and verified test printout)..."
                value={actionsTaken}
                onChange={e => setActionsTaken(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                required
              />
            </div>

            {/* Findings & Root Cause (With Mic) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Findings & Root Cause</label>
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('diagnosis')}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    activeMicField === 'diagnosis'
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-slate-100 text-[#1e3a5f] hover:bg-blue-100'
                  }`}
                  title="Voice to Text"
                >
                  {activeMicField === 'diagnosis' ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#1e3a5f]" />}
                  <span>{activeMicField === 'diagnosis' ? 'Listening...' : 'Voice Dictate'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                placeholder="What was the root cause of the breakdown? (e.g. Network switch port flapping, loose power connector)..."
                value={diagnosisNote}
                onChange={e => setDiagnosisNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>
          </div>

          {/* Step 3: Technical Inspection Checklist */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">3</span>
              Inspection & Verification Checklist
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {checklist.map((item, idx) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-2 bg-white hover:bg-slate-50">
                  <span className="text-xs font-medium text-slate-800">{item.label}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(idx, 'PASS')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        item.status === 'PASS'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      PASS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleChecklistItem(idx, 'FAIL')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        item.status === 'FAIL'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      FAIL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Photo Evidence Upload */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">4</span>
                Work Photos & Evidence
              </h3>
              <span className="text-[10px] text-slate-400">Before / After</span>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
            />

            {/* Photo Previews Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={src} alt="Proof" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#1e3a5f] bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#1e3a5f] transition-all"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[10px] font-semibold">+ Add Photo</span>
              </button>
            </div>
          </div>

          {/* Step 5: Parts Replaced (No Cost/Charge fields) */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">5</span>
              Parts / Components Replaced
            </h3>

            {/* Parts List */}
            {parts.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mb-2">
                {parts.map((p, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-slate-50">
                    <div>
                      <span className="font-semibold text-slate-800">{p.name}</span>
                      <span className="text-[11px] text-slate-500 ml-2">Qty: {p.quantity}</span>
                    </div>
                    <button type="button" onClick={() => handleRemovePart(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Part Row */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <Input
                  placeholder="Part name (e.g. RJ45 Cable, Power Adapter)"
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  value={newPartQty}
                  onChange={e => setNewPartQty(Number(e.target.value))}
                  className="text-xs h-8"
                />
              </div>
              <div className="col-span-2">
                <Button type="button" size="sm" onClick={handleAddPart} className="h-8 w-full bg-[#1e3a5f] text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>

          {/* Step 6: Remarks & Submit Button */}
          <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[#1e3a5f] text-white text-[10px] flex items-center justify-center font-bold">6</span>
                Technician Remarks & Sign-off
              </h3>
              <button
                type="button"
                onClick={() => toggleVoiceDictation('remarks')}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  activeMicField === 'remarks'
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-100 text-[#1e3a5f] hover:bg-blue-100'
                }`}
                title="Voice to Text"
              >
                {activeMicField === 'remarks' ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-[#1e3a5f]" />}
                <span>{activeMicField === 'remarks' ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>

            <textarea
              rows={2}
              placeholder="Any additional remarks or notes for the branch manager..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
            />

            <Button
              type="submit"
              size="lg"
              loading={submitMutation.isPending}
              className="w-full bg-[#1e3a5f] hover:bg-[#172d4a] text-white font-bold text-sm h-12 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Submit Service Report
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
