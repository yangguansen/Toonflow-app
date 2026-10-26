import type { GeneratedMedia } from "@toonflow/tools-scaffold/runtime";
import Stripe from "stripe";
import { databaseRequest, hasSupabaseServiceRoleKey, serviceDatabaseRequest, type AuthUser } from "@/utils/auth/supabase";

type CreditRpcResult = {
  balanceMicrocredits?: unknown;
  reservedMicrocredits?: unknown;
  settled?: unknown;
};

type UsageRow = {
  id: string;
  project_id: string | null;
  media_type: "image" | "video" | "audio";
  provider_id: string;
  model_id: string;
  status: "running" | "succeeded" | "failed";
  reserved_microcredits: number | string;
  charged_microcredits: number | string;
  created_at: string;
  finished_at: string | null;
};

type PurchaseRow = {
  package_id: string;
  amount_cents: number;
  currency: string;
  credits_microcredits: number | string;
  paid_at: string;
};

export type CreditPackage = {
  id: string;
  amountCents: number;
  credits: number;
};

export type AiUsageRecord = {
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

export type PersistedMediaTask = {
  taskId: string;
  status: "running" | "succeeded" | "failed";
  outputFiles: GeneratedMedia[];
  errorCode: string | null;
};

export type LatestNodeMediaTask = PersistedMediaTask;

export type RecoverableVideoJob = {
  id: string;
  ownerId: string;
  projectId: string | null;
  providerId: string;
  modelId: string;
  providerJobId: string;
  outputDirectory: string;
  estimatedCostUsdMicros: number | string;
  recoveryAttempts: number;
};

export const creditPackages = [
  { id: "credits10000", amountCents: 1000, credits: 10000 },
  { id: "credits20000", amountCents: 2000, credits: 20000 },
  { id: "credits50000", amountCents: 5000, credits: 50000 },
] as const satisfies readonly CreditPackage[];

let stripeClient: Stripe | undefined;

function positiveNumber(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} 必须为正数`);
  return value;
}

function creditConfig() {
  return {
    enabled: process.env.TOONFLOW_CREDITS_ENABLED === "true",
    creditUsd: positiveNumber("TOONFLOW_CREDIT_USD", 0.001),
    markupRate: positiveNumber("TOONFLOW_CREDIT_MARKUP_RATE", 1.3),
  };
}

function stripeConfigured() {
  return hasSupabaseServiceRoleKey() && !!process.env.STRIPE_SECRET_KEY?.trim() && !!process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

function stripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw Object.assign(new Error("Stripe 支付尚未配置"), { status: 503, code: "STRIPE_NOT_CONFIGURED" });
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

function creditPackage(packageId: unknown): CreditPackage | undefined {
  return typeof packageId === "string" ? creditPackages.find(item => item.id === packageId) : undefined;
}

function microcredits(value: unknown) {
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : 0;
}

function rpcError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("AI_CREDITS_INSUFFICIENT")) {
    throw Object.assign(new Error("积分不足，请先充值后再试"), { status: 402, code: "AI_CREDITS_INSUFFICIENT" });
  }
  if (message.includes("AI_CREDITS_ADMIN_REQUIRED")) {
    throw Object.assign(new Error("仅管理员可以发放积分"), { status: 403, code: "ADMIN_REQUIRED" });
  }
  if (message.includes("AI_CREDITS_USER_NOT_FOUND")) {
    throw Object.assign(new Error("目标用户不存在"), { status: 404, code: "USER_NOT_FOUND" });
  }
  if (message.includes("AI_CREDITS_INVALID_PURCHASE")) {
    throw Object.assign(new Error("积分购买参数无效"), { status: 400, code: "INVALID_PURCHASE" });
  }
  if (message.includes("AI_CREDITS_SERVICE_REQUIRED")) {
    throw Object.assign(new Error("Stripe 积分入账仅允许服务端调用"), { status: 403, code: "SERVICE_ROLE_REQUIRED" });
  }
  if (message.includes("AI_CREDITS_PROJECT_NOT_FOUND")) {
    throw Object.assign(new Error("项目不存在或无权访问"), { status: 403, code: "PROJECT_NOT_FOUND" });
  }
  if (/duplicate key|already exists/i.test(message)) {
    throw Object.assign(new Error("该生成任务已记账，请勿重复提交"), { status: 409, code: "USAGE_EXISTS" });
  }
  if (/Supabase 请求失败（404）/.test(message)) {
    throw Object.assign(new Error("积分账本尚未初始化，请执行 supabase/migrations/creditLedger.sql 和 stripeCredits.sql"), { status: 503, code: "CREDITS_NOT_CONFIGURED" });
  }
  throw error;
}

async function callCreditRpc<T extends CreditRpcResult>(user: AuthUser, functionName: string, body: Record<string, unknown>) {
  try {
    const response = await databaseRequest(user.accessToken, `rpc/${functionName}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return await response.json() as T;
  } catch (error) {
    rpcError(error);
  }
}

async function callServiceRpc<T>(functionName: string, body: Record<string, unknown>) {
  try {
    const response = await serviceDatabaseRequest(`rpc/${functionName}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return await response.json() as T;
  } catch (error) {
    rpcError(error);
  }
}

export function isAiCreditsEnabled(providerId: string) {
  return providerId === "openrouterMedia" && creditConfig().enabled;
}

export function creditsForUsd(costUsd: number) {
  if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("上游费用无效");
  const { creditUsd, markupRate } = creditConfig();
  // 每笔任务按整积分四舍五入，账本仍使用固定精度的整数单位。
  return Math.round(costUsd / creditUsd * markupRate) * 1_000_000;
}

export function creditsToNumber(microcreditsValue: number | string | null | undefined) {
  return microcredits(microcreditsValue) / 1_000_000;
}

export function usdToMicros(costUsd: number) {
  if (!Number.isFinite(costUsd) || costUsd < 0) throw new Error("上游费用无效");
  return Math.round(costUsd * 1_000_000);
}

export async function reserveAiUsage(user: AuthUser, input: {
  usageId: string;
  projectId: string | null;
  mediaType: "image" | "video" | "audio";
  providerId: string;
  modelId: string;
  estimatedCostUsd: number;
}) {
  const reservedMicrocredits = creditsForUsd(input.estimatedCostUsd);
  const result = await callCreditRpc(user, "reserve_ai_usage", {
    p_usage_id: input.usageId,
    p_project_id: input.projectId,
    p_media_type: input.mediaType,
    p_provider_id: input.providerId,
    p_model_id: input.modelId,
    p_estimated_cost_usd_micros: usdToMicros(input.estimatedCostUsd),
    p_reserved_microcredits: reservedMicrocredits,
  });
  return {
    reservedCredits: creditsToNumber(microcredits(result.reservedMicrocredits)),
    balanceCredits: creditsToNumber(microcredits(result.balanceMicrocredits)),
  };
}

export async function settleAiUsage(user: AuthUser, input: {
  usageId: string;
  actualCostUsd: number;
  outputFiles: GeneratedMedia[];
  providerGenerationId?: string;
  isByok?: boolean;
}) {
  const result = await callCreditRpc(user, "settle_ai_usage", {
    p_usage_id: input.usageId,
    p_actual_cost_usd_micros: usdToMicros(input.actualCostUsd),
    p_charged_microcredits: input.isByok ? 0 : creditsForUsd(input.actualCostUsd),
    p_provider_generation_id: input.providerGenerationId?.slice(0, 500) ?? null,
    p_is_byok: input.isByok ?? null,
    p_output_files: input.outputFiles,
  });
  return { balanceCredits: creditsToNumber(microcredits(result.balanceMicrocredits)) };
}

export async function failAiUsage(user: AuthUser, input: {
  usageId: string;
  actualCostUsd?: number;
  errorCode?: string;
}) {
  const result = await callCreditRpc(user, "fail_ai_usage", {
    p_usage_id: input.usageId,
    p_actual_cost_usd_micros: input.actualCostUsd === undefined ? null : usdToMicros(input.actualCostUsd),
    p_error_code: input.errorCode?.slice(0, 200) ?? null,
  });
  return { balanceCredits: creditsToNumber(microcredits(result.balanceMicrocredits)) };
}

export async function attachAiVideoJob(user: AuthUser, input: {
  usageId: string;
  jobId: string;
  outputDirectory: string;
}) {
  await callCreditRpc(user, "attach_ai_video_job", {
    p_usage_id: input.usageId,
    p_job_id: input.jobId,
    p_output_directory: input.outputDirectory,
  });
}

export async function grantAiCredits(user: AuthUser, input: {
  ownerId: string;
  credits: number;
  note?: string;
}) {
  const result = await callCreditRpc(user, "grant_ai_credits", {
    p_owner_id: input.ownerId,
    p_microcredits: input.credits * 1_000_000,
    p_note: input.note?.trim() ?? "",
  });
  return { balanceCredits: creditsToNumber(microcredits(result.balanceMicrocredits)) };
}

export async function readCreditSummary(user: AuthUser) {
  if (!creditConfig().enabled) return {
    enabled: false,
    purchaseEnabled: false,
    balanceCredits: 0,
    packages: creditPackages,
  };
  await callCreditRpc(user, "release_stale_ai_usage", { p_max_age_seconds: 86400 })
    .catch(error => console.warn("清理过期积分预扣失败：", error));
  const response = await databaseRequest(user.accessToken,
    `credit_wallets?owner_id=eq.${encodeURIComponent(user.id)}&select=balance_microcredits&limit=1`);
  const row = (await response.json() as Array<{ balance_microcredits?: number | string }>)[0];
  return {
    enabled: true,
    purchaseEnabled: stripeConfigured(),
    balanceCredits: creditsToNumber(row?.balance_microcredits),
    packages: creditPackages,
  };
}

export async function createCreditCheckout(user: AuthUser, packageId: string, origin: string) {
  const selectedPackage = creditPackage(packageId);
  if (!selectedPackage) throw Object.assign(new Error("积分套餐不存在"), { status: 400, code: "CREDIT_PACKAGE_NOT_FOUND" });
  if (!stripeConfigured()) throw Object.assign(new Error("Stripe 支付尚未配置"), { status: 503, code: "STRIPE_NOT_CONFIGURED" });

  const publicUrl = process.env.TOONFLOW_PUBLIC_URL?.trim() || origin;
  let webUrl: URL;
  try {
    webUrl = new URL(publicUrl);
  } catch {
    throw Object.assign(new Error("TOONFLOW_PUBLIC_URL 配置无效"), { status: 503, code: "PUBLIC_URL_INVALID" });
  }
  if (!["http:", "https:"].includes(webUrl.protocol)) {
    throw Object.assign(new Error("TOONFLOW_PUBLIC_URL 必须使用 HTTP(S)"), { status: 503, code: "PUBLIC_URL_INVALID" });
  }

  const appRoot = `${webUrl.origin}${webUrl.pathname.replace(/\/$/, "")}`;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: selectedPackage.amountCents,
        product_data: {
          name: `${selectedPackage.credits.toLocaleString("en-US")} Toonflow credits`,
        },
      },
    }],
    metadata: {
      ownerId: user.id,
      packageId: selectedPackage.id,
    },
    payment_intent_data: {
      metadata: {
        ownerId: user.id,
        packageId: selectedPackage.id,
      },
    },
    success_url: `${appRoot}/#/home?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appRoot}/#/home?checkout=cancelled`,
  });
  if (!session.url) throw Object.assign(new Error("Stripe 未返回支付地址"), { status: 502, code: "STRIPE_CHECKOUT_FAILED" });
  return { url: session.url };
}

export async function handleCreditWebhook(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw Object.assign(new Error("Stripe Webhook 尚未配置"), { status: 503, code: "STRIPE_NOT_CONFIGURED" });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch {
    throw Object.assign(new Error("Stripe Webhook 签名无效"), { status: 400, code: "STRIPE_SIGNATURE_INVALID" });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return { processed: false, pending: false };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const ownerId = session.metadata?.ownerId;
  const selectedPackage = creditPackage(session.metadata?.packageId);
  if (session.mode !== "payment" || !ownerId || !selectedPackage) return { processed: false, pending: false };
  if (session.payment_status !== "paid") return { processed: false, pending: true };
  if (session.client_reference_id !== ownerId || session.amount_total !== selectedPackage.amountCents || session.currency !== "usd") {
    throw Object.assign(new Error("Stripe 支付信息与积分套餐不一致"), { status: 422, code: "STRIPE_PURCHASE_MISMATCH" });
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const result = await callServiceRpc<{ credited?: unknown; balanceMicrocredits?: unknown }>("grant_credit_purchase_service", {
    p_owner_id: ownerId,
    p_stripe_checkout_session_id: session.id,
    p_stripe_payment_intent_id: paymentIntentId ?? null,
    p_package_id: selectedPackage.id,
    p_amount_cents: selectedPackage.amountCents,
    p_currency: session.currency,
    p_credits_microcredits: selectedPackage.credits * 1_000_000,
  });
  return {
    processed: true,
    credited: result.credited === true,
    balanceCredits: creditsToNumber(microcredits(result.balanceMicrocredits)),
  };
}

export async function readCreditPurchaseStatus(user: AuthUser, sessionId: string) {
  const response = await databaseRequest(user.accessToken,
    `credit_purchases?owner_id=eq.${encodeURIComponent(user.id)}&stripe_checkout_session_id=eq.${encodeURIComponent(sessionId)}&select=package_id,amount_cents,currency,credits_microcredits,paid_at&limit=1`);
  const row = (await response.json() as PurchaseRow[])[0];
  return {
    processed: !!row,
    packageId: row?.package_id ?? null,
    amountCents: row?.amount_cents ?? null,
    currency: row?.currency ?? null,
    credits: row ? creditsToNumber(row.credits_microcredits) : 0,
    paidAt: row?.paid_at ?? null,
  };
}

export async function listAiUsage(user: AuthUser, limit = 20): Promise<AiUsageRecord[]> {
  const response = await databaseRequest(user.accessToken,
    `ai_usage?owner_id=eq.${encodeURIComponent(user.id)}&select=id,project_id,media_type,provider_id,model_id,status,reserved_microcredits,charged_microcredits,created_at,finished_at&order=created_at.desc&limit=${limit}`);
  return (await response.json() as UsageRow[]).map(row => ({
    id: row.id,
    projectId: row.project_id,
    mediaType: row.media_type,
    providerId: row.provider_id,
    modelId: row.model_id,
    status: row.status,
    reservedCredits: creditsToNumber(row.reserved_microcredits),
    chargedCredits: creditsToNumber(row.charged_microcredits),
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  }));
}

export async function readPersistedMediaTasks(user: AuthUser, taskIds: string[]): Promise<PersistedMediaTask[]> {
  if (!creditConfig().enabled || !taskIds.length) return [];
  const ids = taskIds.map(id => encodeURIComponent(id)).join(",");
  const response = await databaseRequest(user.accessToken,
    `ai_usage?owner_id=eq.${encodeURIComponent(user.id)}&id=in.(${ids})&select=id,status,output_files,error_code`);
  return (await response.json() as Array<{
    id: string;
    status: "running" | "succeeded" | "failed";
    output_files?: unknown;
    error_code?: string | null;
  }>).map(row => mapPersistedTask(row));
}

function mapPersistedTask(row: {
  id: string;
  status: "running" | "succeeded" | "failed";
  output_files?: unknown;
  error_code?: string | null;
}): PersistedMediaTask {
  return {
    taskId: row.id,
    status: row.status,
    outputFiles: Array.isArray(row.output_files)
      ? row.output_files.filter((item): item is GeneratedMedia => !!item && typeof item === "object"
        && typeof (item as GeneratedMedia).path === "string"
        && typeof (item as GeneratedMedia).mimeType === "string"
        && ["image", "video", "audio"].includes(String((item as GeneratedMedia).mediaType)))
      : [],
    errorCode: row.error_code ?? null,
  };
}

export async function readLatestNodeMediaTask(user: AuthUser, input: {
  projectId: string;
  nodeId: string;
  mediaType: "image" | "video" | "audio";
}): Promise<LatestNodeMediaTask | null> {
  if (!creditConfig().enabled) return null;
  const outputDirectory = `assets/${input.nodeId}`;
  const response = await databaseRequest(user.accessToken,
    `ai_usage?owner_id=eq.${encodeURIComponent(user.id)}&project_id=eq.${encodeURIComponent(input.projectId)}&media_type=eq.${input.mediaType}&output_directory=eq.${encodeURIComponent(outputDirectory)}&select=id,status,output_files,error_code&order=created_at.desc&limit=1`);
  const row = (await response.json() as Array<{
    id: string;
    status: "running" | "succeeded" | "failed";
    output_files?: unknown;
    error_code?: string | null;
  }>)[0];
  return row ? mapPersistedTask(row) : null;
}

export async function claimRecoverableVideoJobs(before: Date, limit = 20) {
  if (!hasSupabaseServiceRoleKey()) return [];
  const result = await callServiceRpc<RecoverableVideoJob[]>("claim_ai_video_jobs", {
    p_before: before.toISOString(),
    p_limit: limit,
    p_lease_seconds: 1800,
  });
  return Array.isArray(result) ? result : [];
}

export async function settleRecoveredVideoJob(input: {
  ownerId: string;
  usageId: string;
  actualCostUsd: number;
  outputFiles: GeneratedMedia[];
  providerGenerationId?: string;
  isByok?: boolean;
}) {
  return callServiceRpc<{ settled?: boolean; balanceMicrocredits?: unknown }>("settle_ai_video_job_service", {
    p_owner_id: input.ownerId,
    p_usage_id: input.usageId,
    p_actual_cost_usd_micros: usdToMicros(input.actualCostUsd),
    p_charged_microcredits: input.isByok ? 0 : creditsForUsd(input.actualCostUsd),
    p_output_files: input.outputFiles,
    p_provider_generation_id: input.providerGenerationId ?? null,
    p_is_byok: input.isByok ?? null,
  });
}

export async function failRecoveredVideoJob(input: {
  ownerId: string;
  usageId: string;
  actualCostUsd?: number;
  errorCode?: string;
}) {
  return callServiceRpc<{ released?: boolean; balanceMicrocredits?: unknown }>("fail_ai_video_job_service", {
    p_owner_id: input.ownerId,
    p_usage_id: input.usageId,
    p_actual_cost_usd_micros: input.actualCostUsd === undefined ? null : usdToMicros(input.actualCostUsd),
    p_error_code: input.errorCode?.slice(0, 200) ?? null,
  });
}
