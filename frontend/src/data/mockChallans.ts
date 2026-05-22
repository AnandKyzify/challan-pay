import type { Challan, TimelineEntry } from "@/store/challans";
import { LIST_STATUS_FLOW } from "@/store/challans";
import { COURT_STATUS } from "@/lib/challanStatus";
import { formatTimeOnly } from "@/lib/format";

const STATES = ["MH", "DL", "KA", "TN", "GJ", "UP", "RJ", "WB"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pad(n: number, l: number) {
  return n.toString().padStart(l, "0");
}

function buildTimeline(createdAt: Date, finalStatus: string): TimelineEntry[] {
  if (finalStatus === COURT_STATUS) {
    const t = formatTimeOnly(createdAt);
    return [{ status: COURT_STATUS, time: t, timestamp: createdAt.toISOString() }];
  }
  const idx = LIST_STATUS_FLOW.indexOf(finalStatus);
  const steps = LIST_STATUS_FLOW.slice(0, idx + 1);
  return steps.map((status, i) => {
    const at = new Date(createdAt.getTime() + i * 60_000);
    return { status, time: formatTimeOnly(at), timestamp: at.toISOString() };
  });
}

export function generateMockChallans(count = 48): Challan[] {
  const now = Date.now();
  const items: Challan[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const createdAt = new Date(now - daysAgo * 86400000 - Math.random() * 86400000);
    const isCourt = Math.random() < 0.2;
    const status = isCourt
      ? COURT_STATUS
      : LIST_STATUS_FLOW[Math.floor(Math.random() * LIST_STATUS_FLOW.length)];
    const timeline = buildTimeline(createdAt, status);
    const updatedAt = timeline[timeline.length - 1].timestamp ?? createdAt.toISOString();

    items.push({
      id: crypto.randomUUID(),
      challanNumber: String(4326661747748390 + i).slice(0, 16),
      orderId: `ORD_${1747748392 + i}`,
      rcNumber: `${rand(STATES)}${pad(Math.floor(Math.random() * 99), 2)}${String.fromCharCode(
        65 + Math.floor(Math.random() * 26),
      )}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${pad(
        Math.floor(Math.random() * 9999),
        4,
      )}`,
      amount: [500, 1000, 1500, 2000, 2500, 5000][Math.floor(Math.random() * 6)],
      createdAt: createdAt.toISOString(),
      updatedAt,
      status,
      timeline,
      deleted: Math.random() < 0.08,
    });
  }
  return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}
