import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().delete("/", validateFields({
  id: z.uuid(),
}), async (req, res) => {
  await u.projects.archiveProject(u.authContext.getAuthUser(req), req.body.id);
  res.json(success(null, "项目已从列表移除，文件仍保留在服务器"));
});
