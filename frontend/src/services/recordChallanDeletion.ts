import { useAuthStore } from "@/store/auth";
import { useDeletedChallanLogStore } from "@/store/deletedChallanLogs";
import type { Challan } from "@/store/challans";
import { formatTimeOnly } from "@/lib/format";

/** Writes to the deleted-challan-logs collection (separate from challans). */
export function recordChallanDeletion(challan: Challan) {
  const user = useAuthStore.getState().user;
  if (!user) return;

  const now = new Date();
  useDeletedChallanLogStore.getState().addLog({
    challanId: challan.id,
    challanNumber: challan.challanNumber,
    orderId: challan.orderId,
    rcNumber: challan.rcNumber,
    amount: challan.amount,
    statusAtDelete: challan.status,
    deletedByUserId: user.id,
    deletedByUserName: user.name,
    deletedByUserEmail: user.email,
    deletedAt: now.toISOString(),
    deletedTime: formatTimeOnly(now),
  });
}

export function recordChallanDeletions(challans: Challan[]) {
  challans.forEach(recordChallanDeletion);
}
