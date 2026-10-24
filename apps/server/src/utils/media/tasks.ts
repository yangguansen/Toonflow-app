import type { GeneratedMedia, MediaGenerationRequest } from "@toonflow/tools-scaffold/runtime";
import { error, errorFromCause, success, type ApiResponse } from "@/lib/responseFormat";
import { generateMedia } from "@/utils/media/generation";

type MediaTask = {
  cwd: string;
  mediaType: "image" | "video" | "audio";
  controller: AbortController;
  startedAt: number;
  settledAt?: number;
  result?: ApiResponse<GeneratedMedia[]>;
};

// ACT: 内存只承载当前进程的快速轮询；持久化视频结果由状态接口从数据库恢复。
const tasks = new Map<string, MediaTask>();
const activeTaskLimit = 20;
const taskTimeoutMs = 35 * 60_000;

function stop(task: MediaTask, message: string) {
  if (task.result) return;
  task.result = error<GeneratedMedia[]>(message, null, 499);
  task.controller.abort(new Error(message));
}

function cleanup() {
  const now = Date.now();
  for (const [taskId, task] of tasks) {
    if (task.settledAt !== undefined) {
      if (task.settledAt + 300000 <= now) tasks.delete(taskId);
    } else if (task.startedAt + taskTimeoutMs <= now) {
      stop(task, "生成任务已超过最长执行时间");
    }
  }
}

const cleanupTimer = setInterval(cleanup, 30000);
cleanupTimer.unref();

export function start(cwd: string, taskId: string, mediaType: "image" | "video" | "audio", request: MediaGenerationRequest) {
  cleanup();
  if (tasks.has(taskId)) throw Object.assign(new Error("生成任务已存在，请勿重复提交"), { status: 409 });
  // ACT: 结果缓存总量与真正运行中的任务分别限制；视频不可取消，客户端断开不能释放执行资源。
  const activeTasks = [...tasks.values()].filter(task => task.settledAt === undefined).length;
  if (activeTasks >= activeTaskLimit) throw Object.assign(new Error("生成任务过多，请稍后重试"), { status: 429 });
  if (tasks.size >= 1000) {
    const oldestSettled = [...tasks].find(([, task]) => task.settledAt !== undefined);
    if (oldestSettled) tasks.delete(oldestSettled[0]);
  }
  const task: MediaTask = { cwd, mediaType, controller: new AbortController(), startedAt: Date.now() };
  tasks.set(taskId, task);
  let resolveReady: (() => void) | undefined;
  let rejectReady: ((reason: unknown) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void generateMedia(cwd, mediaType, request, task.controller.signal, taskId, () => resolveReady?.()).then(
    files => {
      task.result ??= success(files);
      resolveReady?.();
    },
    cause => {
      task.result ??= { ...errorFromCause(cause), data: null };
      rejectReady?.(cause);
    },
  ).finally(() => { task.settledAt = Date.now(); });
  return ready;
}

export function status(cwd: string, taskIds: string[]) {
  cleanup();
  return taskIds.map(taskId => {
    const task = tasks.get(taskId);
    if (!task || task.cwd !== cwd) return { taskId, result: error<GeneratedMedia[]>("生成任务不存在或已过期", null, 404) };
    return { taskId, ...(task.result ? { result: task.result } : {}) };
  });
}

export function cancel(cwd: string, taskIds: string[]) {
  const blocked: string[] = [];
  const cancelable: MediaTask[] = [];
  for (const taskId of taskIds) {
    const task = tasks.get(taskId);
    if (!task || task.cwd !== cwd) continue;
    if (task.mediaType === "video" && task.settledAt === undefined) {
      blocked.push(taskId);
      continue;
    }
    cancelable.push(task);
  }
  for (const task of cancelable) stop(task, "生成已取消");
  return blocked;
}
