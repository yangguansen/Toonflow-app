import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  packageId: z.string().trim().min(1).max(64),
}), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const user = u.authContext.getAuthUser(req);
  const origin = u.mcpControl.getAppOrigin(req);
  res.json(success(await u.credits.createCreditCheckout(user, req.body.packageId, origin), "支付页面已创建"));
});
