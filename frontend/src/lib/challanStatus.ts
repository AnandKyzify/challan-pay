/** Timeline status codes stored in collection (append-only on each update). */
export const TIMELINE_STATUS = {
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  CHALLAN_VALIDATED: "CHALLAN_VALIDATED",
  PAYMENT_LINK_GENERATED: "PAYMENT_LINK_GENERATED",
  PAID: "PAID",
  CHALLAN_SENT_IN_COURT: "CHALLAN_SENT_IN_COURT",
} as const;

export type TimelineStatusCode = (typeof TIMELINE_STATUS)[keyof typeof TIMELINE_STATUS];

export const COURT_STATUS = TIMELINE_STATUS.CHALLAN_SENT_IN_COURT;

/** Matches backend normalize_timeline_status for dashboard / charts grouping. */
const DETAIL_TO_TIMELINE: Record<string, string> = {
  challan_initiated: TIMELINE_STATUS.PAYMENT_INITIATED,
  payment_initiated: TIMELINE_STATUS.PAYMENT_INITIATED,
  challan_validated: TIMELINE_STATUS.CHALLAN_VALIDATED,
  payment_link_generated: TIMELINE_STATUS.PAYMENT_LINK_GENERATED,
  paid: TIMELINE_STATUS.PAID,
  challan_sent_in_court: TIMELINE_STATUS.CHALLAN_SENT_IN_COURT,
  challan_added: TIMELINE_STATUS.PAYMENT_INITIATED,
  pending: TIMELINE_STATUS.PAYMENT_INITIATED,
  processing: TIMELINE_STATUS.PAYMENT_INITIATED,
  validation_pending: TIMELINE_STATUS.CHALLAN_VALIDATED,
};

const KNOWN_UPPER = new Set<string>(Object.values(TIMELINE_STATUS));

export function normalizeTimelineStatus(status: string): string {
  const spaced = status.trim().replace(/\s+/g, "_").toUpperCase();
  if (KNOWN_UPPER.has(spaced)) return spaced;
  const lower = status.trim().toLowerCase();
  return DETAIL_TO_TIMELINE[lower] ?? spaced;
}

/** Main list workflow statuses (excludes court). */
export const LIST_TIMELINE_STATUSES: string[] = [
  TIMELINE_STATUS.PAYMENT_INITIATED,
  TIMELINE_STATUS.CHALLAN_VALIDATED,
  TIMELINE_STATUS.PAYMENT_LINK_GENERATED,
  TIMELINE_STATUS.PAID,
];

export function formatStatusLabel(status: string): string {
  const normalized = status.trim().replace(/\s+/g, "_").toUpperCase();
  const labels: Record<string, string> = {
    PAYMENT_INITIATED: "Payment initiated",
    CHALLAN_VALIDATED: "Challan validated",
    PAYMENT_LINK_GENERATED: "Payment link generated",
    PAID: "Paid",
    CHALLAN_SENT_IN_COURT: "Sent in court",
    "CHALLAN ADDED": "Added",
    "CHALLAN PENDING": "Pending",
    "CHALLAN PAID": "Paid",
    "CHALLAN SENT IN COURT": "Sent in court",
  };
  if (labels[normalized]) return labels[normalized];
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isCourtStatus(status: string): boolean {
  return status.toUpperCase().includes("COURT");
}

export function isListScopeStatus(status: string): boolean {
  return !isCourtStatus(status);
}

export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s.includes("COURT")) return "bg-primary/15 text-primary border-primary/35";
  if (s === "PAID" || s.includes("PAID")) return "bg-success/15 text-success border-success/35";
  if (s.includes("VALIDATED") || s.includes("LINK") || s.includes("PENDING"))
    return "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning";
  return "bg-info/15 text-info border-info/35";
}
