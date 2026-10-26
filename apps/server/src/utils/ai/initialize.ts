import deepSeek from "@toonflow/providers/language/deepSeek";
import conf from "@/utils/conf";
import { fetchProviderModels } from "@/utils/ai/models";
import { getProviderSecret } from "@/utils/config/providerSecrets";

type ProviderModel = Awaited<ReturnType<typeof fetchProviderModels>>[number];

let initialization: Promise<void> | undefined;

function mergeSavedReasoning(previousModels: unknown, models: ProviderModel[]) {
  const savedModels = Array.isArray(previousModels)
    ? previousModels.filter(item => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[]
    : [];
  return models.map(model => {
    const saved = savedModels.find(item => item.id === model.id);
    return saved && Object.hasOwn(saved, "reasoningEfforts")
      ? { ...model, reasoningEfforts: saved.reasoningEfforts }
      : model;
  });
}

async function configureDefaultLanguageProvider() {
  const providers = conf.get("settings", {}).customProviders;
  const savedProvider = Array.isArray(providers)
    ? providers.find(item => item && typeof item === "object" && !Array.isArray(item)
      && (item as Record<string, unknown>).id === deepSeek.id)
    : undefined;
  const savedModels = savedProvider && "models" in savedProvider ? savedProvider.models : undefined;
  let models = mergeSavedReasoning(savedModels, []);
  const apiKey = getProviderSecret(deepSeek.id);
  if (apiKey) {
    try {
      const fetchedModels = await fetchProviderModels({
        apiUrl: deepSeek.apiUrl,
        protocol: deepSeek.protocol,
        apiKey,
      });
      if (fetchedModels.length) {
        models = mergeSavedReasoning(savedModels, fetchedModels);
      } else {
        console.warn("DeepSeek 未返回可用模型，保留已有模型列表");
      }
    } catch (error) {
      console.warn("DeepSeek 模型列表刷新失败，保留已有模型：", error);
    }
  } else {
    console.warn("DEEPSEEK_API_KEY 未配置，默认语言模型不可用");
  }
  // ACT: 密钥只在运行时由环境变量覆盖，不写入 settings.json。
  conf.set("settings.customProviders", [{
    id: deepSeek.id,
    label: deepSeek.label,
    icon: deepSeek.icon,
    version: deepSeek.version,
    apiUrl: deepSeek.apiUrl,
    protocol: deepSeek.protocol,
    apiKey: "",
    models,
  }]);
}

export async function refreshProviderModels(_previousSettings?: Record<string, unknown>) {
  await configureDefaultLanguageProvider();
  return { customProviders: conf.get("settings", {}).customProviders };
}

export default function initializeProviderModels() {
  return initialization ??= configureDefaultLanguageProvider();
}
