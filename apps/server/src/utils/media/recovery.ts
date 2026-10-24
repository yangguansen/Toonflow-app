import { realpath } from "@toonflow/file";
import type { ProviderUsage } from "@toonflow/providers";
import conf from "@/utils/conf";
import { getProjectDirectory } from "@/utils/auth/context";
import { hasSupabaseServiceRoleKey } from "@/utils/auth/supabase";
import {
  claimRecoverableVideoJobs,
  failRecoveredVideoJob,
  settleRecoveredVideoJob,
  type RecoverableVideoJob,
} from "@/utils/credits";
import { withProviderSecrets } from "@/utils/config/providerSecrets";
import { getMediaProvider, loadMediaProviderSource } from "@/utils/media/provider";
import { saveGeneratedMedia } from "@/utils/media/generation";

const recoveryIntervalMs = 5 * 60_000;
const recoveryLimit = 20;
let recovering = false;

class RecoveryRetryError extends Error {}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function errorCode(error: unknown) {
  return (error instanceof Error ? error.name : "RECOVERY_FAILED").slice(0, 200);
}

function isTerminalTaskError(error: unknown) {
  return !!error && typeof error === "object" && (error as { taskTerminal?: unknown }).taskTerminal === true;
}

async function recoverVideoJob(job: RecoverableVideoJob) {
  let reportedUsage: ProviderUsage | undefined;
  try {
    if (!job.projectId) throw new Error("恢复任务缺少项目目录");
    const info = await getMediaProvider(job.providerId);
    const configurations = record(conf.get("settings", {}).mediaProviderConfigs);
    const signal = AbortSignal.timeout(30 * 60_000);
    const provider = await loadMediaProviderSource(
      info.source,
      withProviderSecrets(info.id, record(configurations[info.id])),
      signal,
      undefined,
      undefined,
      usage => { reportedUsage = usage; },
    );
    if (!provider.resumeVideo) throw new Error("当前供应商不支持恢复视频任务");
    let assets: Awaited<ReturnType<NonNullable<typeof provider.resumeVideo>>> | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        assets = await provider.resumeVideo(job.providerJobId);
        break;
      } catch (error) {
        if (isTerminalTaskError(error) || attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    if (!assets) throw new Error("视频任务恢复未返回结果");
    const directory = await realpath(getProjectDirectory(job.ownerId, job.projectId));
    const outputFiles = await saveGeneratedMedia(directory, "video", assets, job.outputDirectory, signal, job.id);
    const actualCostUsd = reportedUsage?.costUsd ?? Number(job.estimatedCostUsdMicros) / 1_000_000;
    try {
      await settleRecoveredVideoJob({
        ownerId: job.ownerId,
        usageId: job.id,
        actualCostUsd,
        outputFiles,
        providerGenerationId: reportedUsage?.generationId,
        isByok: reportedUsage?.isByok,
      });
    } catch (error) {
      throw new RecoveryRetryError("视频任务结算失败，等待下次恢复重试", { cause: error });
    }
    console.log(`[视频任务恢复成功]: ${job.id}`);
  } catch (error) {
    if (error instanceof RecoveryRetryError) {
      console.error(`[视频任务恢复待重试]: ${job.id}`, error);
      return;
    }
    console.error(`[视频任务恢复失败]: ${job.id}`, error);
    await failRecoveredVideoJob({
      ownerId: job.ownerId,
      usageId: job.id,
      actualCostUsd: reportedUsage?.costUsd,
      errorCode: errorCode(error),
    }).catch(releaseError => console.error(`[视频任务预扣释放失败]: ${job.id}`, releaseError));
  }
}

export async function recoverMediaTasks(before: Date) {
  if (recovering) return;
  recovering = true;
  try {
    for (;;) {
      const jobs = await claimRecoverableVideoJobs(before, recoveryLimit);
      if (!jobs.length) break;
      let index = 0;
      const workers = Array.from({ length: Math.min(3, jobs.length) }, async () => {
        while (index < jobs.length) {
          const job = jobs[index++];
          if (job) await recoverVideoJob(job);
        }
      });
      await Promise.all(workers);
      if (jobs.length < recoveryLimit) break;
    }
  } finally {
    recovering = false;
  }
}

export function startMediaTaskRecovery(before: Date) {
  if (process.env.TOONFLOW_CREDITS_ENABLED !== "true") return;
  if (!hasSupabaseServiceRoleKey()) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY 未配置，视频任务自动恢复未启用");
    return;
  }
  const run = () => void recoverMediaTasks(before)
    .catch(error => console.error("视频任务恢复扫描失败：", error));
  run();
  const timer = setInterval(run, recoveryIntervalMs);
  timer.unref();
}
