import { Router } from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().get("/", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const user = await u.authSession.resolveRequestAuth(req, res);
  if (!user) {
    res.json(success({ authenticated: false, user: null, isAdmin: false }));
    return;
  }
  res.json(success({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.profile.displayName,
      avatarUrl: user.profile.avatarUrl,
      role: user.profile.role,
    },
    isAdmin: user.isAdmin,
  }));
});
