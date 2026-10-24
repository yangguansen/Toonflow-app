import { Router } from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const user = await u.authSession.resolveRequestAuth(req, res);
    if (user) await u.authSupabase.revokeAuthSession(user.accessToken);
  } catch (error) {
    console.warn("关闭 Supabase 会话失败：", error);
  } finally {
    u.authCookies.clearSessionCookies(req, res);
  }
  res.json(success(null, "已退出登录"));
});
