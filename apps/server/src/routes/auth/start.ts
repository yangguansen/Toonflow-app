import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { error } from "@/lib/responseFormat";
import { validateFields } from "@/lib/middleware";
import u from "@/utils";

export default Router().get("/", validateFields({ provider: z.string().regex(/^[a-z][a-z0-9-]*$/) }, "query"), (req, res) => {
  const provider = req.query.provider as string;
  const config = u.authSupabase.getSupabaseConfig();
  if (!config.providers.includes(provider)) {
    res.status(400).json(error("当前环境未启用此登录方式", null, 400));
    return;
  }
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const origin = (process.env.TOONFLOW_PUBLIC_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
  const target = new URL(`${config.url}/auth/v1/authorize`);
  target.searchParams.set("provider", provider);
  target.searchParams.set("redirect_to", `${origin}/api/auth/callback`);
  target.searchParams.set("code_challenge", challenge);
  target.searchParams.set("code_challenge_method", "s256");
  u.authCookies.setAuthVerifier(req, res, verifier);
  res.set("Cache-Control", "no-store").redirect(target.href);
});
