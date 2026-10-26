import axios from "axios";
import { translate } from "@toonflow/i18n/vue";
import { ref } from "vue";

export type CreditSummary = {
  enabled: boolean;
  purchaseEnabled: boolean;
  balanceCredits: number;
  packages: CreditPackage[];
};

export type CreditPackage = {
  id: string;
  amountCents: number;
  credits: number;
};

export type CreditPurchaseStatus = {
  processed: boolean;
  packageId: string | null;
  amountCents: number | null;
  currency: string | null;
  credits: number;
  paidAt: string | null;
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
        throw new Error(summaryResponse.data.message || translate("读取积分余额失败"));
      }
      let usage: CreditUsage[] = [];
      if (summaryResponse.data.data.enabled) {
        const usageResponse = await axios.get<{ code: number; data: CreditUsage[]; message?: string }>("/api/credits/usage/list", {
          params: { limit: 20 },
          headers: { "x-toonflow-workspace": "1" },
        });
        if (usageResponse.data.code !== 200 || !Array.isArray(usageResponse.data.data)) {
          throw new Error(usageResponse.data.message || translate("读取积分用量失败"));
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
          : error instanceof Error ? error.message : translate("读取积分信息失败");
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

export async function createCreditCheckout(packageId: string) {
  const response = await axios.post<{ code: number; data: { url: string }; message?: string }>("/api/credits/checkout", {
    packageId,
  }, { headers: { "x-toonflow-workspace": "1" } });
  if (response.data.code !== 200 || !response.data.data?.url) throw new Error(response.data.message || translate("创建支付页面失败"));
  return response.data.data.url;
}

export async function readCreditPurchaseStatus(sessionId: string) {
  const response = await axios.get<{ code: number; data: CreditPurchaseStatus; message?: string }>("/api/credits/purchases/status", {
    params: { sessionId },
    headers: { "x-toonflow-workspace": "1" },
  });
  if (response.data.code !== 200 || !response.data.data) throw new Error(response.data.message || translate("查询支付结果失败"));
  return response.data.data;
}

export async function waitForCreditPurchase(sessionId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const status = await readCreditPurchaseStatus(sessionId);
    if (status.processed) return status;
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return readCreditPurchaseStatus(sessionId);
}
