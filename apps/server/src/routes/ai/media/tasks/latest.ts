import { Router } from "express";
import { z } from "zod";
import { basename } from "node:path";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  directory: z.string().min(1).max(4096),
  nodeId: z.uuid(),
  mediaType: z.enum(["image", "video", "audio"]),
}), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const cwd = await u.workspace.resolveWorkspace(req, req.body.directory);
  const projectId = basename(cwd);
  const task = z.uuid().safeParse(projectId).success
    ? await u.credits.readLatestNodeMediaTask(u.authContext.getAuthUser(req), {
      projectId,
      nodeId: req.body.nodeId,
      mediaType: req.body.mediaType,
    })
    : null;
  res.set("Cache-Control", "no-store").json(success(task));
});
