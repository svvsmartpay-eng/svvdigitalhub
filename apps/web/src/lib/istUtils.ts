/**
 * Indian Standard Time (IST) Utilities
 * Ensures all timestamps and duration calculations are strictly formatted in Asia/Kolkata timezone.
 */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Formats a Date/ISO string to IST time only: e.g. "10:20 AM"
 */
export function formatISTTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '--:--';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a Date/ISO string to IST Date & Time: e.g. "02 Mar 2026, 10:12 AM"
 */
export function formatISTDateTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '---';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '---';

  const dateStr = d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Returns IST Date code component: e.g. "02-MAR-26"
 */
export function getISTDateCode(dateInput?: string | Date | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const istDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = String(istDate.getDate()).padStart(2, '0');
  const mon = MONTHS[istDate.getMonth()];
  const yr = String(istDate.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}

/**
 * Formats elapsed minutes into human readable text: e.g. "8 mins", "1h 15m", "<1 min"
 */
export function formatDurationMins(minutesOrSeconds: number, isSeconds = false): string {
  const totalMins = isSeconds ? Math.round(minutesOrSeconds / 60) : Math.round(minutesOrSeconds);
  if (totalMins <= 0) return '< 1 min';
  if (totalMins < 60) return `${totalMins} mins`;
  const hrs = Math.floor(totalMins / 60);
  const rem = totalMins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs} hrs`;
}

/**
 * Calculates waiting time, processing time, and total duration from ticket timestamps in minutes
 */
export function calculateTicketDurations(ticket: {
  received_at?: string | null;
  started_at?: string | null;
  closed_at?: string | null;
  createdAt?: string | null;
  waiting_time_seconds?: number;
  processing_time_seconds?: number;
  total_duration_seconds?: number;
}) {
  const received = new Date(ticket.received_at || ticket.createdAt || Date.now()).getTime();
  const started = ticket.started_at ? new Date(ticket.started_at).getTime() : null;
  const closed = ticket.closed_at ? new Date(ticket.closed_at).getTime() : null;
  const now = Date.now();

  let waitingMinutes = 0;
  if (ticket.waiting_time_seconds && ticket.waiting_time_seconds > 0) {
    waitingMinutes = Math.round(ticket.waiting_time_seconds / 60);
  } else if (started) {
    waitingMinutes = Math.max(0, Math.round((started - received) / 60000));
  } else {
    waitingMinutes = Math.max(0, Math.round((now - received) / 60000));
  }

  let processingMinutes = 0;
  if (ticket.processing_time_seconds && ticket.processing_time_seconds > 0) {
    processingMinutes = Math.round(ticket.processing_time_seconds / 60);
  } else if (started) {
    const end = closed || now;
    processingMinutes = Math.max(0, Math.round((end - started) / 60000));
  }

  const totalMinutes = waitingMinutes + processingMinutes;

  return {
    waitingMinutes,
    processingMinutes,
    totalMinutes,
    waitingText: formatDurationMins(waitingMinutes),
    processingText: formatDurationMins(processingMinutes),
    totalText: formatDurationMins(totalMinutes),
  };
}
