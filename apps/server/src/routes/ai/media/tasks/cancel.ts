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
  const blockedTaskIds = u.mediaTasks.cancel(cwd, taskIds);
  if (blockedTaskIds.length) {
    res.status(409).json(error("视频任务提交后不可取消，请等待后台生成完成", { taskIds: blockedTaskIds }, 409));
    return;
  }
  res.json(success());
});
