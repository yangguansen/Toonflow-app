import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  name: z.string().trim().min(1).max(80),
  initializeCanvas: z.boolean().optional(),
}), async (req, res) => {
  const project = await u.projects.createProject(u.authContext.getAuthUser(req), req.body.name, req.body.initializeCanvas !== false);
  res.status(201).json(success(project, "项目已创建"));
});
