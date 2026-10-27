import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  email: z.string().trim().email().max(320),
}), async (req, res) => {
  const expectedOrigin = process.env.TOONFLOW_PUBLIC_URL
    ? new URL(process.env.TOONFLOW_PUBLIC_URL).origin
    : `${req.protocol}://${req.get("host")}`;
  const origin = req.get("origin");
  if ((origin && origin !== expectedOrigin) || req.get("sec-fetch-site") === "cross-site") {
    throw Object.assign(new Error("请求来源无效"), { status: 403 });
  }

  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await u.authSupabase.sendMagicLink(
    String(req.body.email).trim().toLowerCase(),
    `${expectedOrigin}/api/auth/callback`,
    challenge,
  );
  u.authCookies.setAuthVerifier(req, res, verifier, 60 * 60 * 1000);
  res.set("Cache-Control", "no-store").json(success(null, "登录链接已发送"));
});
