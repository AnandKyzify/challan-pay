import { api } from "@/services/api";
import type { Challan } from "@/store/challans";
import type { DeletedChallanLog } from "@/store/deletedChallanLogs";

export const deletedChallanLogService = {
  async list(): Promise<DeletedChallanLog[]> {
    return api.get<DeletedChallanLog[]>("/deleted-logs");
  },

  async restore(logId: string): Promise<Challan> {
    return api.post<Challan>(`/deleted-logs/${encodeURIComponent(logId)}/restore`);
  },
};
