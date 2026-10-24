import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().get("/", validateFields({
  limit: z.coerce.number().int().min(1).max(50).optional(),
}, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  res.set("Cache-Control", "no-store").json(success(await u.credits.listAiUsage(u.authContext.getAuthUser(req), limit)));
});
