import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateMockDeletedChallanLogs } from "@/data/mockDeletedChallanLogs";

/**
 * Separate DB collection for delete audit trail.
 * Shape aligned with backend: challan snapshot + who deleted + when.
 */
export interface DeletedChallanLog {
  id: string;
  challanId: string;
  challanNumber: string;
  orderId: string;
  rcNumber: string;
  amount: number;
  statusAtDelete: string;
  deletedByUserId: string;
  deletedByUsername?: string;
  deletedByUserName: string;
  deletedByUserEmail: string;
  deletedAt: string;
  deletedTime: string;
  challanCreatedAt?: string;
  restored?: boolean;
  restoredAt?: string | null;
  restoredByUserId?: string | null;
  restoredByUserName?: string | null;
  restoredByUserEmail?: string | null;
}

export type DeletedChallanLogInput = Omit<DeletedChallanLog, "id">;

interface DeletedChallanLogState {
  logs: DeletedChallanLog[];
  hydrated: boolean;
  ensureSeeded: () => void;
  addLog: (input: DeletedChallanLogInput) => DeletedChallanLog;
}

export const useDeletedChallanLogStore = create<DeletedChallanLogState>()(
  persist(
    (set, get) => ({
      logs: [],
      hydrated: false,
      ensureSeeded: () => {
        if (!get().hydrated) {
          set({ logs: generateMockDeletedChallanLogs(), hydrated: true });
        }
      },
      addLog: (input) => {
        const log: DeletedChallanLog = {
          ...input,
          id: crypto.randomUUID(),
        };
        set((s) => ({ logs: [log, ...s.logs] }));
        return log;
      },
    }),
    { name: "cms-deleted-challan-logs" },
  ),
);
