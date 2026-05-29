export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/** Display all DB/API instants in India time (matches challan_status timestamps). */
const DISPLAY_TZ = "Asia/Kolkata";

/** Parse API/Mongo instants; naive strings are interpreted as IST (legacy DB data). */
export function parseDbInstant(iso: string): Date | null {
  const raw = iso?.trim();
  if (!raw) return null;
  const hasOffset = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasOffset
    ? raw
    : raw.includes("T") || raw.includes(" ")
      ? `${raw.replace(" ", "T")}+05:30`
      : raw;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatDateTime = (iso: string) => {
  const d = parseDbInstant(iso);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: DISPLAY_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/** Narrower date column in tables (date + time on two lines). */
export function formatListDateTimeParts(iso: string): { date: string; time: string } {
  const d = parseDbInstant(iso);
  if (!d) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString("en-IN", {
      timeZone: DISPLAY_TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", {
      timeZone: DISPLAY_TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

/** Full date + time from timeline `timestamp` (DB), or fallback label. */
export const formatTimelineWhen = (timestamp?: string | null, timeLabel?: string) => {
  if (timestamp) return formatDateTime(timestamp);
  return timeLabel?.trim() || "—";
};

/** Compact date + time rows for timeline (saves horizontal space). */
export function formatTimelineDateRows(
  timestamp?: string | null,
  timeLabel?: string,
): { date: string; time: string } | null {
  const d = timestamp ? parseDbInstant(timestamp) : null;
  if (d) {
    return {
      date: d.toLocaleDateString("en-IN", {
        timeZone: DISPLAY_TZ,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-IN", {
        timeZone: DISPLAY_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }
  const label = timeLabel?.trim();
  if (!label) return null;
  return { date: label, time: "" };
}

export const formatDate = (iso: string) => {
  const d = parseDbInstant(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    timeZone: DISPLAY_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Display time for timeline entries, e.g. "10:00 AM" */
export const formatTimeOnly = (date: Date = new Date()) =>
  date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export const relativeTime = (iso: string) => {
  const d = parseDbInstant(iso);
  if (!d) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
};

/** When the delete log row was written (from `challan_deleted_logs.deleted_at`). */
export const formatDeletedAt = (iso: string) => formatDateTime(iso);
