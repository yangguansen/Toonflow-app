import { databaseRequest, type AuthUser } from "@/utils/auth/supabase";

export const userSettingKeys = ["ui", "general", "privacy", "personalization", "helloCompleted", "stores", "agentSystemPrompt"] as const;

export function pickUserSettings(settings: Record<string, unknown>) {
  return Object.fromEntries(userSettingKeys.flatMap(key => Object.hasOwn(settings, key) ? [[key, settings[key]]] : []));
}

export async function readUserSettings(user: AuthUser) {
  const response = await databaseRequest(user.accessToken,
    `user_settings?owner_id=eq.${encodeURIComponent(user.id)}&select=settings&limit=1`);
  const row = (await response.json() as Array<{ settings?: unknown }>)[0];
  return row?.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
    ? row.settings as Record<string, unknown>
    : {};
}

export async function writeUserSettings(user: AuthUser, settings: Record<string, unknown>) {
  await databaseRequest(user.accessToken, "user_settings?on_conflict=owner_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ owner_id: user.id, settings: pickUserSettings(settings) }),
  });
}

