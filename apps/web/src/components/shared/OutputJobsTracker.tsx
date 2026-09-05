import React, { useState, useEffect } from 'react';
import {
  OutputJob,
  useTicketOutputJobs,
  useCreateOutputJob,
  useUpdateOutputJobStatus,
  useCloseTicket,
  useSendCustomerNotification,
} from '@/api/printHub.api';
import { formatISTTime, calculateTicketDurations } from '@/lib/istUtils';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Clock, Play, Plus, AlertCircle, X, Check,
  ChevronRight, Sparkles, MessageSquare, ShieldCheck, Flag, Lock
} from 'lucide-react';
import { STANDARD_SERVICES } from './ServiceSelectionModal';

interface OutputJobsTrackerProps {
  ticket: any;
  onRefresh?: () => void;
  onOpenServiceModal?: () => void;
  hideTimestamping?: boolean;
}

export default function OutputJobsTracker({
  ticket,
  onRefresh,
  onOpenServiceModal,
  hideTimestamping = false,
}: OutputJobsTrackerProps) {
  const { data: jobs = [], isLoading, refetch } = useTicketOutputJobs(ticket?.id);
  const updateJobMutation = useUpdateOutputJobStatus();
  const createJobMutation = useCreateOutputJob();
  const closeTicketMutation = useCloseTicket();
  const sendNotificationMutation = useSendCustomerNotification();

  const [skippingJobId, setSkippingJobId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [showAddInline, setShowAddInline] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('50');
  const [confirmPrintJob, setConfirmPrintJob] = useState<OutputJob | null>(null);

  const durations = calculateTicketDurations(ticket || {});

  // Determine if all output jobs have reached terminal states
  const hasJobs = jobs.length > 0;
  const allJobsDone = hasJobs && jobs.every((j) =>
    ['COMPLETED', 'SKIPPED', 'NOT_REQUIRED'].includes(j.status)
  );

  const handleStartJob = (job: OutputJob) => {
    updateJobMutation.mutate(
      { jobId: job.id, ticketId: ticket.id, status: 'IN_PROGRESS' },
      { onSuccess: () => { refetch(); onRefresh?.(); } }
    );
  };

  const handleCompleteJob = (job: OutputJob) => {
    // If job requires print confirmation and hasn't been confirmed yet, trigger confirmation prompt
    const isPrintType = ['PHOTO_PRINT', 'LAMINATION', 'PVC_PRINT', 'COLOR_PRINT', 'BW_XEROX'].includes(job.service_type) || job.requires_print_confirmation;
    if (isPrintType && !job.print_confirmed_at) {
      setConfirmPrintJob(job);
      return;
    }

    executeCompleteJob(job, false);
  };

  const executeCompleteJob = (job: OutputJob, wasPrintConfirmed = false) => {
    const durationSec = job.started_at
      ? Math.max(10, Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000))
      : 60;
    updateJobMutation.mutate(
      {
        jobId: job.id,
        ticketId: ticket.id,
        status: 'COMPLETED',
        duration_seconds: durationSec,
        print_confirmed: wasPrintConfirmed,
      },
      {
        onSuccess: () => {
          setConfirmPrintJob(null);
          refetch();
          onRefresh?.();
        },
      }
    );
  };

  const handleConfirmSkip = (jobId: string) => {
    if (!skipReason.trim()) {
      alert('Please specify a skip reason.');
      return;
    }
    updateJobMutation.mutate(
      { jobId, ticketId: ticket.id, status: 'SKIPPED', skip_reason: skipReason.trim() },
      {
        onSuccess: () => {
          setSkippingJobId(null);
          setSkipReason('');
          refetch();
          onRefresh?.();
        },
      }
    );
  };

  const handleMarkNotRequired = (jobId: string) => {
    updateJobMutation.mutate(
      { jobId, ticketId: ticket.id, status: 'NOT_REQUIRED', skip_reason: 'Not required by customer' },
      { onSuccess: () => { refetch(); onRefresh?.(); } }
    );
  };

  const handleAddInlineService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    createJobMutation.mutate(
      {
        ticket_id: ticket.id,
        service_type: 'CUSTOM',
        service_name: newServiceName.trim(),
        price: Number(newServicePrice) || 50,
      },
      {
        onSuccess: () => {
          setNewServiceName('');
          setShowAddInline(false);
          refetch();
          onRefresh?.();
        },
      }
    );
  };

  const handleCloseTicket = () => {
    if (!allJobsDone) {
      alert('Ticket closes only when all output jobs are completed, skipped with reason, or marked not required.');
      return;
    }
    if (confirm(`Close Ticket #${ticket.tokenNumber || ticket.ticket_code} and notify customer?`)) {
      closeTicketMutation.mutate(
        { ticketId: ticket.id },
        { onSuccess: () => { onRefresh?.(); } }
      );
    }
  };

  const handleNotifyWaiting = () => {
    if (!ticket?.customerPhone) return;
    sendNotificationMutation.mutate({
      branchId: ticket.branchId,
      phone: ticket.customerPhone,
      type: 'WAITING_FOR_CUSTOMER',
      ticketNo: ticket.tokenNumber || ticket.ticket_code,
    }, {
      onSuccess: () => alert(`Notification sent to customer: Waiting for details.`),
      onError: (err: any) => alert(`Failed: ${err.message}`),
    });
  };

  const handleNotifyCompleted = () => {
    if (!ticket?.customerPhone) return;
    sendNotificationMutation.mutate({
      branchId: ticket.branchId,
      phone: ticket.customerPhone,
      type: 'SERVICE_COMPLETED',
      ticketNo: ticket.tokenNumber || ticket.ticket_code,
    }, {
      onSuccess: () => alert(`Notification sent to customer: Service Completed.`),
      onError: (err: any) => alert(`Failed: ${err.message}`),
    });
  };

  const isClosed = ticket.ticket_status === 'CLOSED' || ticket.status === 'DELIVERED';

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs flex flex-col">
      {/* 1. Header with Ticket Info & Quick Notify Actions */}
      <div className="p-3.5 bg-[#081B3A] text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-[#0D6EFD] bg-white px-2 py-0.5 rounded-md">
              {ticket.tokenNumber || ticket.ticket_code || 'T-New'}
            </span>
            <span className="font-bold text-sm truncate">{ticket.customerName}</span>
          </div>
          <p className="text-[11px] text-[#CBD5E1] mt-0.5">
            Received: {formatISTTime(ticket.received_at || ticket.createdAt)} (IST)
          </p>
        </div>

        {/* Customer Notification Triggers */}
        {!isClosed && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNotifyWaiting}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#334155] hover:bg-[#475569] text-white transition-colors cursor-pointer"
              title="Send Notification: Waiting for Customer Information"
            >
              ⏳ Wait Info
            </button>
            <button
              type="button"
              onClick={handleNotifyCompleted}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-[#198754] hover:bg-[#157347] text-white transition-colors cursor-pointer"
              title="Send Notification: Service Completed"
            >
              ✅ Done Notify
            </button>
          </div>
        )}
      </div>

      {/* 2. Audit Timeline Strip (Received ➔ Work Started ➔ Last Activity ➔ Completed) */}
      {!hideTimestamping && (
        <div className="px-3 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs">
          <div className="grid grid-cols-4 gap-1 text-center font-sans">
            <div className="p-1 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Received</span>
              <span className="font-mono font-bold text-[#081B3A] text-xs">
                {formatISTTime(ticket.received_at || ticket.createdAt)}
              </span>
            </div>
            <div className="p-1 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Started</span>
              <span className="font-mono font-bold text-[#0D6EFD] text-xs">
                {ticket.started_at ? formatISTTime(ticket.started_at) : '--:--'}
              </span>
            </div>
            <div className="p-1 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Last Active</span>
              <span className="font-mono font-bold text-[#081B3A] text-xs">
                {formatISTTime(ticket.last_activity_at || ticket.updatedAt)}
              </span>
            </div>
            <div className="p-1 rounded-lg bg-white border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] block font-semibold">Completed</span>
              <span className="font-mono font-bold text-[#198754] text-xs">
                {ticket.closed_at ? formatISTTime(ticket.closed_at) : (isClosed ? 'Closed' : 'Active')}
              </span>
            </div>
          </div>

          {/* Live Durations Pill Bar */}
          <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-[#E2E8F0] text-[#475569]">
            <span>Waiting: <strong className="text-[#081B3A]">{durations.waitingText}</strong></span>
            <span>Processing: <strong className="text-[#0D6EFD]">{durations.processingText}</strong></span>
            <span>Total: <strong className="text-[#198754]">{durations.totalText}</strong></span>
          </div>
        </div>
      )}

      {/* 3. Output Jobs List (Step 5: Output Jobs Progress) */}
      <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto max-h-[380px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#081B3A] uppercase tracking-wider flex items-center gap-1.5">
            <span>Output Jobs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#E2E8F0] text-[#081B3A] text-[10px]">
              {jobs.length}
            </span>
          </span>

          {!isClosed && (
            <button
              type="button"
              onClick={() => setShowAddInline(!showAddInline)}
              className="text-xs font-bold text-[#0D6EFD] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
          )}
        </div>

        {/* Inline Add Service Form */}
        {showAddInline && !isClosed && (
          <form onSubmit={handleAddInlineService} className="p-2.5 bg-[#EFF6FF] rounded-xl border border-[#B6D4FE] space-y-2">
            <span className="text-xs font-bold text-[#081B3A] block">Add Output Job to Ticket</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Service Name (e.g. Lamination)"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#081B3A]"
                autoFocus
              />
              <input
                type="number"
                placeholder="Price"
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                className="w-16 bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-xs text-[#081B3A]"
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddInline(false)}
                className="px-2 py-1 text-xs text-[#64748B] hover:text-[#081B3A]"
              >
                Cancel
              </button>
              <Button type="submit" size="sm" className="h-6 text-xs bg-[#0D6EFD] text-white">
                Add
              </Button>
            </div>
          </form>
        )}

        {/* No Output Jobs Yet */}
        {jobs.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#CBD5E1] text-center space-y-2">
            <p className="text-xs text-[#64748B]">No output jobs created yet for this ticket.</p>
            {!isClosed && onOpenServiceModal && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenServiceModal}
                className="bg-[#0D6EFD] text-white text-xs font-bold"
              >
                <Play className="w-3 h-3 mr-1" /> Select Services & Start Work
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job, idx) => {
              const isCompleted = job.status === 'COMPLETED';
              const isInProgress = job.status === 'IN_PROGRESS';
              const isSkipped = job.status === 'SKIPPED';
              const isNotReq = job.status === 'NOT_REQUIRED';

              return (
                <div
                  key={job.id}
                  className={`p-3 rounded-xl border transition-all space-y-2 ${
                    isCompleted
                      ? 'bg-[#F0FDF4] border-[#86EFAC]'
                      : isInProgress
                      ? 'bg-[#EFF6FF] border-[#60A5FA] shadow-xs'
                      : isSkipped || isNotReq
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-75'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#081B3A] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#081B3A]">{job.service_name}</span>
                    </div>

                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-[#198754] text-white text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {isInProgress && (
                      <span className="px-2 py-0.5 rounded-full bg-[#0D6EFD] text-white text-[10px] font-bold flex items-center gap-1 animate-pulse">
                        <Play className="w-2.5 h-2.5" /> In Progress
                      </span>
                    )}
                    {job.status === 'NOT_STARTED' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E2E8F0] text-[#475569] text-[10px] font-semibold">
                        Not Started
                      </span>
                    )}
                    {isSkipped && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold">
                        Skipped
                      </span>
                    )}
                    {isNotReq && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold">
                        Not Required
                      </span>
                    )}
                  </div>

                  {/* Timing & Duration Note */}
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
                    <span>
                      {job.started_at ? `Started: ${formatISTTime(job.started_at)}` : 'Waiting to start'}
                      {job.completed_at ? ` • Done: ${formatISTTime(job.completed_at)}` : ''}
                    </span>
                    {job.duration_seconds > 0 && (
                      <span>Duration: {Math.round(job.duration_seconds / 60) || 1} mins</span>
                    )}
                  </div>

                  {job.skip_reason && (
                    <p className="text-[10px] text-[#B45309] italic bg-[#FEF3C7] p-1.5 rounded-md">
                      Reason: {job.skip_reason}
                    </p>
                  )}

                  {/* Job Action Buttons */}
                  {!isClosed && (
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#E2E8F0]">
                      {job.status === 'NOT_STARTED' && (
                        <button
                          type="button"
                          onClick={() => handleStartJob(job)}
                          className="px-2 py-1 rounded bg-[#0D6EFD] text-white text-[11px] font-bold hover:bg-[#0b5ed7] cursor-pointer flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Start
                        </button>
                      )}

                      {(job.status === 'NOT_STARTED' || isInProgress) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCompleteJob(job)}
                            className="px-2.5 py-1 rounded bg-[#198754] text-white text-[11px] font-bold hover:bg-[#157347] cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" /> Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => setSkippingJobId(job.id)}
                            className="px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#081B3A] text-[11px] font-medium cursor-pointer"
                          >
                            Skip...
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkNotRequired(job.id)}
                            className="px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#94A3B8] hover:text-[#64748B] text-[11px] font-medium cursor-pointer"
                          >
                            Not Req
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Skip with Reason Inline Modal */}
                  {skippingJobId === job.id && (
                    <div className="p-2.5 bg-[#FFFBEB] rounded-lg border border-[#FDE68A] space-y-2 mt-2">
                      <span className="text-xs font-bold text-[#92400E] block">Skip Reason Required</span>
                      <input
                        type="text"
                        placeholder="e.g. Customer opted out, Document missing"
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                        className="w-full bg-white border border-[#FCD34D] rounded px-2 py-1 text-xs text-[#081B3A]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setSkippingJobId(null); setSkipReason(''); }}
                          className="px-2 py-0.5 text-xs text-[#78350F]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmSkip(job.id)}
                          className="px-2.5 py-0.5 rounded bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold"
                        >
                          Confirm Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Footer: Close Ticket Button (Enforces All Jobs Done rule) */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        {isClosed ? (
          <div className="p-2.5 rounded-xl bg-[#D1E7DD] border border-[#BADBCC] text-center text-xs font-bold text-[#0F5132] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Ticket Closed & Fully Delivered
          </div>
        ) : (
          <div className="space-y-2">
            {!allJobsDone && (
              <p className="text-[11px] text-[#64748B] text-center">
                All output jobs must be marked Completed, Skipped, or Not Required to close ticket.
              </p>
            )}
            <Button
              type="button"
              disabled={!allJobsDone || closeTicketMutation.isPending}
              onClick={handleCloseTicket}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                allJobsDone
                  ? 'bg-[#198754] hover:bg-[#157347] text-white animate-in zoom-in-95'
                  : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {allJobsDone ? 'All Jobs Completed – Close Ticket' : 'Complete All Output Jobs to Close'}
            </Button>
          </div>
        )}
      </div>

      {/* 5. Print Confirmation Modal */}
      {confirmPrintJob && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#081B3A]">Confirm Print Output</h3>
                <p className="text-xs text-[#64748B]">{confirmPrintJob.service_name}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <p className="font-semibold text-slate-700">Did the document print clearly?</p>
              <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5">
                <li>Check alignment and margins</li>
                <li>Check color accuracy & paper orientation</li>
                <li>Verify customer documents returned</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmPrintJob(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Needs Reprint
              </button>
              <button
                type="button"
                onClick={() => executeCompleteJob(confirmPrintJob, true)}
                className="px-4 py-1.5 rounded-lg bg-[#198754] hover:bg-[#157347] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Print Verified OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
