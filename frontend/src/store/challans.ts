import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockChallans } from "@/data/mockChallans";
import { TIMELINE_STATUS, COURT_STATUS } from "@/lib/challanStatus";
import { formatTimeOnly } from "@/lib/format";

/** Matches collection shape: { status, time } per step; timestamp for ordering/real-time. */
export interface TimelineEntry {
  status: string;
  time: string;
  timestamp?: string;
}

export interface Challan {
  id: string;
  /** Challan_num in collection */
  challanNumber: string;
  /** order_id in collection */
  orderId: string;
  rcNumber: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  /** Latest status (last timeline entry) */
  status: string;
  timeline: TimelineEntry[];
  deleted?: boolean;
  /** True when `challan_receipt` has a PDF for this challan number. */
  receiptPresent?: boolean;
}

export { COURT_STATUS, TIMELINE_STATUS };

export const LIST_STATUS_FLOW = [
  TIMELINE_STATUS.PAYMENT_INITIATED,
  TIMELINE_STATUS.CHALLAN_VALIDATED,
  TIMELINE_STATUS.PAYMENT_LINK_GENERATED,
  TIMELINE_STATUS.PAID,
];

/** @deprecated */
export const STATUS_FLOW = LIST_STATUS_FLOW;

function createTimelineEntry(status: string, at: Date = new Date()): TimelineEntry {
  const timestamp = at.toISOString();
  return { status, time: formatTimeOnly(at), timestamp };
}

function migrateChallan(raw: Record<string, unknown>): Challan {
  const timeline = raw.timeline as TimelineEntry[] | undefined;
  if (Array.isArray(timeline) && timeline.length > 0) {
    return raw as unknown as Challan;
  }
  const history = raw.history as { status: string; timestamp: string }[] | undefined;
  if (Array.isArray(history) && history.length > 0) {
    const migrated: TimelineEntry[] = history.map((h) => ({
      status: String(h.status).replace(/\s+/g, "_").toUpperCase(),
      time: formatTimeOnly(new Date(h.timestamp)),
      timestamp: h.timestamp,
    }));
    return {
      ...(raw as unknown as Challan),
      timeline: migrated,
      status: migrated[migrated.length - 1].status,
    };
  }
  const status = String(raw.status ?? TIMELINE_STATUS.PAYMENT_INITIATED);
  const ts = String(raw.updatedAt ?? raw.createdAt ?? new Date().toISOString());
  const entry = createTimelineEntry(status, new Date(ts));
  return {
    ...(raw as unknown as Challan),
    timeline: [entry],
    status: entry.status,
  };
}

interface ChallanState {
  challans: Challan[];
  hydrated: boolean;
  ensureSeeded: () => void;
  addChallan: (
    input: Omit<Challan, "id" | "createdAt" | "updatedAt" | "status" | "timeline">,
    options?: { initialStatus?: string },
  ) => Challan;
  /** Appends a new timeline step (collection update pattern). */
  appendTimelineStatus: (id: string, status: string) => void;
  deleteChallan: (id: string) => void;
  deleteMany: (ids: string[]) => void;
  restore: (id: string) => void;
}

export const useChallanStore = create<ChallanState>()(
  persist(
    (set, get) => ({
      challans: [],
      hydrated: false,
      ensureSeeded: () => {
        if (!get().hydrated) {
          set({ challans: generateMockChallans(48), hydrated: true });
        }
      },
      addChallan: (input, options) => {
        const now = new Date();
        const status = options?.initialStatus ?? TIMELINE_STATUS.PAYMENT_INITIATED;
        const first = createTimelineEntry(status, now);
        const challan: Challan = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          status: first.status,
          timeline: [first],
        };
        set((s) => ({ challans: [challan, ...s.challans] }));
        return challan;
      },
      appendTimelineStatus: (id, status) => {
        const now = new Date();
        const entry = createTimelineEntry(status, now);
        set((s) => ({
          challans: s.challans.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: entry.status,
                  updatedAt: now.toISOString(),
                  timeline: [...c.timeline, entry],
                }
              : c,
          ),
        }));
      },
      deleteChallan: (id) =>
        set((s) => ({
          challans: s.challans.map((c) =>
            c.id === id ? { ...c, deleted: true, updatedAt: new Date().toISOString() } : c,
          ),
        })),
      deleteMany: (ids) => {
        const set2 = new Set(ids);
        const now = new Date().toISOString();
        set((s) => ({
          challans: s.challans.map((c) =>
            set2.has(c.id) ? { ...c, deleted: true, updatedAt: now } : c,
          ),
        }));
      },
      restore: (id) =>
        set((s) => ({
          challans: s.challans.map((c) => (c.id === id ? { ...c, deleted: false } : c)),
        })),
    }),
    {
      name: "cms-challans",
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { challans?: Record<string, unknown>[]; hydrated?: boolean };
        if (!state?.challans) return persisted as ChallanState;
        if (version < 2) {
          return {
            ...state,
            challans: state.challans.map((c) => migrateChallan(c)),
          };
        }
        return persisted;
      },
    },
  ),
);
