import { Router } from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", async (req, res) => {
  const signature = req.get("stripe-signature");
  if (!req.stripeRawBody || !signature) {
    throw Object.assign(new Error("Stripe Webhook 请求无效"), { status: 400, code: "STRIPE_WEBHOOK_INVALID" });
  }
  res.json(success(await u.credits.handleCreditWebhook(req.stripeRawBody, signature)));
});
