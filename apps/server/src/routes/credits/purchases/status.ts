import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().get("/", validateFields({
  sessionId: z.string().trim().min(1).max(255),
}, "query"), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  res.set("Cache-Control", "no-store").json(success(
    await u.credits.readCreditPurchaseStatus(u.authContext.getAuthUser(req), String(req.query.sessionId)),
  ));
});
