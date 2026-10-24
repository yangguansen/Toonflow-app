import { createHash } from "node:crypto";

export type AuthProfile = {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
};

export type AuthUser = {
  id: string;
  email: string;
  accessToken: string;
  profile: AuthProfile;
  isAdmin: boolean;
};

type SupabaseConfig = {
  url: string;
  anonKey: string;
  providers: string[];
  adminEmails: Set<string>;
};

type CachedAuth = {
  user: AuthUser;
  expiresAt: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  msg?: string;
};

const authCache = new Map<string, CachedAuth>();
const refreshRequests = new Map<string, Promise<AuthTokens>>();

function configurationError(message: string) {
  return Object.assign(new Error(message), { status: 503, code: "AUTH_NOT_CONFIGURED" });
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw configurationError("Supabase 认证尚未配置");
  if (!URL.canParse(url) || !["http:", "https:"].includes(new URL(url).protocol)) {
    throw configurationError("SUPABASE_URL 必须是有效的 HTTP(S) 地址");
  }
  const providers = (process.env.SUPABASE_OAUTH_PROVIDERS ?? "github,google")
    .split(",")
    .map(provider => provider.trim().toLowerCase())
    .filter(provider => /^[a-z][a-z0-9-]*$/.test(provider));
  return {
    url,
    anonKey,
    providers: [...new Set(providers)],
    adminEmails: new Set((process.env.TOONFLOW_ADMIN_EMAILS ?? "").split(",")
      .map(email => email.trim().toLowerCase()).filter(Boolean)),
  };
}

export function getPublicAuthConfig() {
  try {
    const config = getSupabaseConfig();
    return { configured: true, providers: config.providers };
  } catch (error) {
    return {
      configured: false,
      providers: [] as string[],
      message: error instanceof Error ? error.message : "Supabase 认证尚未配置",
    };
  }
}

function unauthorized(message = "登录状态已失效，请重新登录") {
  return Object.assign(new Error(message), { status: 401, code: "UNAUTHORIZED" });
}

function tokenExpiry(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return 0;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function isAccessTokenExpiring(token: string, skewMs = 30000) {
  const expiresAt = tokenExpiry(token);
  return !expiresAt || expiresAt <= Date.now() + skewMs;
}

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw configurationError("SUPABASE_SERVICE_ROLE_KEY 尚未配置");
  return key;
}

export function hasSupabaseServiceRoleKey() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

async function supabaseRequest(config: SupabaseConfig, accessToken: string, path: string, init: RequestInit = {}, apiKey = config.anonKey) {
  let response: Response;
  try {
    response = await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
        ...Object.fromEntries(new Headers(init.headers)),
      },
      signal: init.signal ?? AbortSignal.timeout(10000),
    });
  } catch (cause) {
    throw Object.assign(new Error("无法连接 Supabase，请检查网络后重试", { cause }), { status: 503, code: "AUTH_UNAVAILABLE" });
  }
  if (response.status === 401) throw unauthorized();
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`Supabase 请求失败（${response.status}）${detail ? `：${detail.slice(0, 500)}` : ""}`),
      { status: response.status >= 500 ? 503 : response.status, code: "AUTH_REQUEST_FAILED" });
  }
  return response;
}

export async function databaseRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {},
) {
  const config = getSupabaseConfig();
  return supabaseRequest(config, accessToken, `/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
}

export async function serviceDatabaseRequest(path: string, init: RequestInit = {}) {
  const config = getSupabaseConfig();
  const key = serviceRoleKey();
  return supabaseRequest(config, key, `/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init.headers)),
    },
  }, key);
}

async function tokenRequest(config: SupabaseConfig, grantType: "pkce" | "refresh_token", body: Record<string, string>) {
  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/token?grant_type=${grantType}`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (cause) {
    throw Object.assign(new Error("无法连接 Supabase 认证服务，请检查网络后重试", { cause }), { status: 503, code: "AUTH_UNAVAILABLE" });
  }
  const data = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !data.access_token || !data.refresh_token) {
    const message = data.error_description || data.error || data.msg || "登录凭证交换失败";
    throw Object.assign(new Error(message), { status: response.status === 400 ? 401 : response.status, code: "AUTH_FAILED" });
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Math.max(60, data.expires_in ?? 3600),
  } satisfies AuthTokens;
}

export function exchangeAuthorizationCode(code: string, codeVerifier: string) {
  return tokenRequest(getSupabaseConfig(), "pkce", { auth_code: code, code_verifier: codeVerifier });
}

export function refreshAuthTokens(refreshToken: string) {
  const cacheKey = createHash("sha256").update(refreshToken).digest("hex");
  let request = refreshRequests.get(cacheKey);
  if (!request) {
    request = tokenRequest(getSupabaseConfig(), "refresh_token", { refresh_token: refreshToken })
      .finally(() => {
        if (refreshRequests.get(cacheKey) === request) refreshRequests.delete(cacheKey);
      });
    refreshRequests.set(cacheKey, request);
  }
  return request;
}

export async function revokeAuthSession(accessToken: string) {
  const config = getSupabaseConfig();
  await supabaseRequest(config, accessToken, "/auth/v1/logout", { method: "POST" });
}

async function loadProfile(accessToken: string, authenticatedUser: Record<string, unknown>, config: SupabaseConfig): Promise<AuthProfile> {
  const id = String(authenticatedUser.id);
  const email = typeof authenticatedUser.email === "string" ? authenticatedUser.email.toLowerCase() : "";
  const metadata = authenticatedUser.user_metadata && typeof authenticatedUser.user_metadata === "object"
    ? authenticatedUser.user_metadata as Record<string, unknown>
    : {};
  const displayName = [metadata.full_name, metadata.name, email.split("@")[0], "Toonflow 用户"]
    .find(value => typeof value === "string" && value.trim()) as string;
  const avatarUrl = [metadata.avatar_url, metadata.picture].find(value => typeof value === "string") as string | undefined;

  let response = await databaseRequest(accessToken,
    `profiles?id=eq.${encodeURIComponent(id)}&select=display_name,avatar_url,role&limit=1`);
  let row = (await response.json() as Array<{ display_name?: unknown; avatar_url?: unknown; role?: unknown }>)[0];
  if (!row) {
    try {
      response = await databaseRequest(accessToken, "profiles", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ id, display_name: displayName.slice(0, 120), avatar_url: (avatarUrl ?? "").slice(0, 2048) }),
      });
      row = (await response.json() as Array<{ display_name?: unknown; avatar_url?: unknown; role?: unknown }>)[0];
    } catch (error) {
      if ((error as { status?: number }).status !== 409) throw error;
      response = await databaseRequest(accessToken,
        `profiles?id=eq.${encodeURIComponent(id)}&select=display_name,avatar_url,role&limit=1`);
      row = (await response.json() as Array<{ display_name?: unknown; avatar_url?: unknown; role?: unknown }>)[0];
    }
  }
  if (!row) throw Object.assign(new Error("无法创建用户资料，请确认 Supabase 数据表已初始化"), { status: 503 });
  const role = row?.role === "admin" || config.adminEmails.has(email) ? "admin" : "user";
  return {
    id,
    displayName: typeof row?.display_name === "string" && row.display_name ? row.display_name : displayName,
    avatarUrl: typeof row?.avatar_url === "string" ? row.avatar_url : "",
    role,
  };
}

export async function verifyAccessToken(accessToken: string) {
  if (!accessToken || accessToken.length > 16384) throw unauthorized();
  const config = getSupabaseConfig();
  const cacheKey = createHash("sha256").update(accessToken).digest("hex");
  const cached = authCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const response = await supabaseRequest(config, accessToken, "/auth/v1/user");
  const authenticatedUser = await response.json() as Record<string, unknown>;
  if (typeof authenticatedUser.id !== "string") throw unauthorized();
  const profile = await loadProfile(accessToken, authenticatedUser, config);
  const user: AuthUser = {
    id: authenticatedUser.id,
    email: typeof authenticatedUser.email === "string" ? authenticatedUser.email : "",
    accessToken,
    profile,
    isAdmin: profile.role === "admin",
  };
  const tokenExpiresAt = tokenExpiry(accessToken);
  const cacheUntil = Math.min(Date.now() + 60000, tokenExpiresAt ? tokenExpiresAt - 5000 : Number.POSITIVE_INFINITY);
  if (cacheUntil > Date.now()) authCache.set(cacheKey, { user, expiresAt: cacheUntil });
  if (authCache.size > 10000) {
    const now = Date.now();
    for (const [key, value] of authCache) if (value.expiresAt <= now) authCache.delete(key);
  }
  return user;
}
