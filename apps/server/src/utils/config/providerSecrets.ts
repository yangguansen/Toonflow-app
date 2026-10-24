type ProviderConfig = Record<string, unknown>;

const individualApiKeyEnv = {
  tfRouter: "TF_ROUTER_API_KEY",
  deepSeek: "DEEPSEEK_API_KEY",
  openrouterMedia: "OPENROUTER_API_KEY",
  autodlImage: "AUTODL_IMAGE_API_KEY",
  autodl: "AUTODL_API_KEY",
} as const;

let cachedConfigText = "";
let cachedProviderConfigs: Record<string, ProviderConfig> = {};

function providerConfigEnv() {
  const text = process.env.TOONFLOW_PROVIDER_CONFIGS?.trim() ?? "";
  if (text === cachedConfigText) return cachedProviderConfigs;
  cachedConfigText = text;
  cachedProviderConfigs = {};
  if (!text) return cachedProviderConfigs;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("必须是 JSON 对象");
    cachedProviderConfigs = Object.fromEntries(Object.entries(parsed).flatMap(([id, config]) =>
      config && typeof config === "object" && !Array.isArray(config) ? [[id, config as ProviderConfig]] : []));
  } catch (error) {
    console.error("TOONFLOW_PROVIDER_CONFIGS 解析失败：", error);
  }
  return cachedProviderConfigs;
}

export function getProviderEnvConfig(providerId: string) {
  return providerConfigEnv()[providerId] ?? {};
}

export function getProviderSecret(providerId: string, _config?: ProviderConfig) {
  const envName = individualApiKeyEnv[providerId as keyof typeof individualApiKeyEnv];
  const specific = envName ? process.env[envName]?.trim() : "";
  const configured = getProviderEnvConfig(providerId).apiKey;
  return specific || (typeof configured === "string" ? configured.trim() : "")
    || "";
}

export function withProviderSecrets(providerId: string, config?: ProviderConfig) {
  return {
    ...config,
    ...getProviderEnvConfig(providerId),
    apiKey: getProviderSecret(providerId, config),
  };
}
