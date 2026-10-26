import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { error, success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  directory: z.string().min(1).max(4096), taskIds: z.array(z.uuid()).min(1).max(100),
}), async (req, res) => {
  const { directory, taskIds } = req.body;
  const cwd = await u.workspace.resolveWorkspace(req, directory);
  const current = u.mediaTasks.status(cwd, taskIds);
  const missingIds = current.filter(item => (!item.result || item.result.code === 404) && item.taskId)
    .map(item => item.taskId);
  const persisted = await u.credits.readPersistedMediaTasks(u.authContext.getAuthUser(req), missingIds);
  const byId = new Map(persisted.map(item => [item.taskId, item]));
  const results = current.map(item => {
    if (item.result && item.result.code !== 404) return item;
    const stored = byId.get(item.taskId);
    if (!stored) return item;
    if (stored.status === "succeeded") {
      if (!stored.outputFiles.length) return { taskId: item.taskId, result: error("生成任务不存在或已过期", null, 404) };
      return { taskId: item.taskId, result: success(stored.outputFiles) };
    }
    if (stored.status === "failed") return { taskId: item.taskId, result: error("媒体生成失败，请重新发起", null, 500) };
    return { taskId: item.taskId };
  });
  res.set("Cache-Control", "no-store").json(success(results));
});
