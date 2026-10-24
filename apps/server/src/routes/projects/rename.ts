import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().put("/", validateFields({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
}), async (req, res) => {
  res.json(success(await u.projects.renameProject(u.authContext.getAuthUser(req), req.body.id, req.body.name), "项目已重命名"));
});
