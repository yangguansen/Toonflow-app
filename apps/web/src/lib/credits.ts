import axios from "axios";
import { ref } from "vue";

export type CreditSummary = {
  enabled: boolean;
  balanceCredits: number;
};

export type CreditUsage = {
  id: string;
  projectId: string | null;
  mediaType: "image" | "video" | "audio";
  providerId: string;
  modelId: string;
  status: "running" | "succeeded" | "failed";
  reservedCredits: number;
  chargedCredits: number;
  createdAt: string;
  finishedAt: string | null;
};

export const creditSummary = ref<CreditSummary>();
export const creditUsage = ref<CreditUsage[]>([]);
export const creditLoading = ref(false);
export const creditError = ref("");
let pending: Promise<void> | undefined;
let requestRevision = 0;

export function refreshCredits() {
  if (pending) return pending;
  const revision = ++requestRevision;
  creditLoading.value = true;
  creditError.value = "";
  pending = (async () => {
    try {
      const summaryResponse = await axios.get<{ code: number; data: CreditSummary; message?: string }>("/api/credits/get", {
        headers: { "x-toonflow-workspace": "1" },
      });
      if (summaryResponse.data.code !== 200 || !summaryResponse.data.data) {
        throw new Error(summaryResponse.data.message || "读取积分余额失败");
      }
      let usage: CreditUsage[] = [];
      if (summaryResponse.data.data.enabled) {
        const usageResponse = await axios.get<{ code: number; data: CreditUsage[]; message?: string }>("/api/credits/usage/list", {
          params: { limit: 20 },
          headers: { "x-toonflow-workspace": "1" },
        });
        if (usageResponse.data.code !== 200 || !Array.isArray(usageResponse.data.data)) {
          throw new Error(usageResponse.data.message || "读取积分用量失败");
        }
        usage = usageResponse.data.data;
      }
      if (revision === requestRevision) {
        creditSummary.value = summaryResponse.data.data;
        creditUsage.value = usage;
      }
    } catch (error) {
      if (revision === requestRevision) {
        creditError.value = axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message || error.message
          : error instanceof Error ? error.message : "读取积分信息失败";
      }
    } finally {
      if (revision === requestRevision) {
        creditLoading.value = false;
        pending = undefined;
      }
    }
  })();
  return pending;
}
