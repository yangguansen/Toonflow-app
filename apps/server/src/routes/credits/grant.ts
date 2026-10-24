import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  ownerId: z.uuid(),
  credits: z.number().int().positive().max(1_000_000_000),
  note: z.string().trim().max(200).optional(),
}), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const user = u.authContext.assertAdmin(req);
  res.json(success(await u.credits.grantAiCredits(user, req.body), "积分已发放"));
});
