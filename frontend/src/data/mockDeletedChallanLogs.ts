import type { DeletedChallanLog } from "@/store/deletedChallanLogs";
import { formatTimeOnly } from "@/lib/format";
import { TIMELINE_STATUS } from "@/lib/challanStatus";

const DELETERS = [
  { id: "u1", name: "Admin User", email: "admin@challan.local" },
  { id: "u2", name: "Priya Sharma", email: "priya@challan.local" },
  { id: "u3", name: "Rahul Mehta", email: "rahul@challan.local" },
];

export function generateMockDeletedChallanLogs(count = 12): DeletedChallanLog[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const deletedAt = new Date(now - (i + 1) * 86400000 * 2 - Math.random() * 3600000);
    const deleter = DELETERS[i % DELETERS.length];
    return {
      id: crypto.randomUUID(),
      challanId: crypto.randomUUID(),
      challanNumber: String(4326661747700000 + i),
      orderId: `ORD_${1747748392 + i}`,
      rcNumber: `MH12AB${1000 + i}`,
      amount: [500, 1000, 1500, 2000, 2500][i % 5],
      statusAtDelete: [
        TIMELINE_STATUS.PAYMENT_INITIATED,
        TIMELINE_STATUS.CHALLAN_VALIDATED,
        TIMELINE_STATUS.PAID,
      ][i % 3],
      deletedByUserId: deleter.id,
      deletedByUserName: deleter.name,
      deletedByUserEmail: deleter.email,
      deletedAt: deletedAt.toISOString(),
      deletedTime: formatTimeOnly(deletedAt),
    };
  });
}
