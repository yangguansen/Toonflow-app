import u from "@/utils";
import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import { maxSystemPromptLength } from "@/agent/runtime/prompt";
import { t } from "@/lib/i18n";
import { providerSchema } from "@/utils/ai";

const router = Router();

export default router.put("/", validateFields({ settings: z.record(z.string(), z.json()).and(z.object({
  agentSystemPrompt: z.string().max(maxSystemPromptLength, { error: () => t`系统提示词不能超过 ${maxSystemPromptLength} 个字符` }).optional(),
  customProviders: z.array(providerSchema.extend({ id: z.string().min(1), label: z.string() })).optional(),
  desktopUpdateSource: z.enum(["official", "github", "custom"]).optional(),
  desktopUpdateCustomUrl: z.string().max(2048).refine(value => !value || u.desktop.isValidUpdateUrl(value),
    "自定义更新源必须是不含账号、查询参数或锚点的 HTTP(S) 地址").optional(),
  mcp: z.object({ enabled: z.boolean().optional(), token: z.string().optional(), port: z.number().int().min(1).max(65535).optional() }).optional(),
})).refine(value => value.desktopUpdateSource !== "custom" || !!value.desktopUpdateCustomUrl, {
  path: ["desktopUpdateCustomUrl"], message: "选择自定义更新源前，请先填写有效地址",
}) }), async (req, res) => {
  u.mcpControl.assertAppRequest(req);
  const { settings } = req.body;
  const user = u.authContext.getAuthUser(req);
  const previousUserSettings = await u.userSettings.readUserSettings(user);
  const userSettings = { ...previousUserSettings, ...u.userSettings.pickUserSettings(settings) };
  await u.userSettings.writeUserSettings(user, userSettings);
  res.json(success(u.redactSettings({
    aiModels: u.ai.listAiModels(),
    nodeMenu: userSettings.general && typeof userSettings.general === "object"
      ? (userSettings.general as Record<string, unknown>).nodeMenu ?? null
      : null,
  }), "个人设置已保存"));
});
