import { api } from "@/services/api";
import {
  challanListQueryParams,
  type ChallanListQuery,
} from "@/lib/challanListQuery";
import type { Challan } from "@/store/challans";

const defaultListQuery: ChallanListQuery = { mode: "lifetime" };

export const challanService = {
  async list(query: ChallanListQuery = defaultListQuery): Promise<Challan[]> {
    return api.get<Challan[]>(`/challans?${challanListQueryParams(query)}`);
  },

  /** Server-filtered list for Sent in Court (faster than loading all challans). */
  async listSentInCourt(query: ChallanListQuery = defaultListQuery): Promise<Challan[]> {
    return api.get<Challan[]>(`/challans/sent-in-court?${challanListQueryParams(query)}`);
  },

  async getById(id: string): Promise<Challan> {
    return api.get<Challan>(`/challans/${id}`);
  },

  async create(
    input: {
      challanNumber: string;
      orderId: string;
      amount: number;
    },
    options?: { initialStatus?: string },
  ): Promise<Challan> {
    return api.post<Challan>("/challans", {
      challanNumber: input.challanNumber,
      orderId: input.orderId,
      amount: input.amount,
      initialStatus: options?.initialStatus,
    });
  },

  async appendTimelineStatus(id: string, status: string): Promise<Challan> {
    return api.patch<Challan>(`/challans/${id}/timeline`, { status });
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/challans/${id}`);
  },

  async removeMany(ids: string[]): Promise<void> {
    await api.post("/challans/bulk-delete", { ids });
  },
};
