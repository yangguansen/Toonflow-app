import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import u from "@/utils";

function redirectError(res: Response, message: string) {
  res.redirect(`/?authError=${encodeURIComponent(message.slice(0, 500))}`);
}

export default Router().get("/", validateFields({
  code: z.string().min(1).max(4096).optional(),
  state: z.string().min(1).max(1024).optional(),
  error: z.string().max(256).optional(),
  error_description: z.string().max(4096).optional(),
}, "query"), async (req, res) => {
  const query = req.query as { code?: string; state?: string; error?: string; error_description?: string };
  const verifier = u.authCookies.readAuthVerifier(req);
  u.authCookies.clearAuthVerifier(req, res);
  res.set("Cache-Control", "no-store");
  if (query.error) {
    console.warn("Authentication provider returned an error:", query.error, query.error_description || "");
    redirectError(res, query.error_description || query.error);
    return;
  }
  if (!query.code) {
    console.warn("Authentication callback missing transaction data:", {
      host: req.get("host"),
      hasCode: !!query.code,
      hasState: !!query.state,
      verifierFound: !!verifier,
    });
    redirectError(res, "登录回调缺少必要参数，请重新登录");
    return;
  }
  if (!verifier) {
    console.warn("Authentication callback transaction expired or was not found:", {
      host: req.get("host"),
      hasCode: true,
      hasState: !!query.state,
    });
    redirectError(res, "登录状态已过期，请重新登录");
    return;
  }
  try {
    const tokens = await u.authSupabase.exchangeAuthorizationCode(query.code, verifier);
    await u.authSupabase.verifyAccessToken(tokens.accessToken);
    u.authCookies.setSessionCookies(req, res, tokens);
    res.redirect("/#/workspace");
  } catch (error) {
    u.authCookies.clearSessionCookies(req, res);
    console.error("Authentication callback failed:", error);
    redirectError(res, error instanceof Error ? error.message : "登录失败，请重试");
  }
});
