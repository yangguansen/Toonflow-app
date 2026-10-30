import { Router } from "express";
import { z } from "zod";
import { validateFields, assertSameOrigin } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", assertSameOrigin, validateFields({
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(72),
}), async (req, res) => {
  const tokens = await u.authSupabase.signInWithPassword(
    String(req.body.email).trim().toLowerCase(),
    String(req.body.password),
  );
  u.authCookies.setSessionCookies(req, res, tokens);
  res.set("Cache-Control", "no-store").json(success(null, "登录成功"));
});
