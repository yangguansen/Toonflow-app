import u from "@/utils";
import { Router } from "express";
import { success } from "@/lib/responseFormat";

const router = Router();

export default router.get("/", async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  res.set("Cache-Control", "no-store");
  const user = u.authContext.getAuthUser(req);
  const userSettings = await u.userSettings.readUserSettings(user);
  const safeUserSettings = Object.fromEntries(u.userSettings.userSettingKeys.flatMap(key =>
    Object.hasOwn(userSettings, key) ? [[key, userSettings[key]]] : []));
  const providers = u.conf.get("settings.customProviders");
  res.json(success(u.redactSettings({
    ...safeUserSettings,
    customProviders: Array.isArray(providers)
      ? providers.map(provider => ({ ...(provider as Record<string, unknown>), apiKey: "" }))
      : [],
  })));
});
