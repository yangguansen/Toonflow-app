import axios from "axios";
import { reactive } from "vue";
import { translate } from "@toonflow/i18n/vue";

type AuthConfig = {
  configured: boolean;
  providers: string[];
  message?: string;
};

type AuthProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: "user" | "admin";
};

type SessionResponse = {
  authenticated: boolean;
  user: AuthProfile | null;
  isAdmin: boolean;
};

const legacySessionKey = "toonflow.auth.session.v1";
const legacyVerifierKey = "toonflow.auth.pending.v1";
const nativeFetch = window.fetch.bind(window);
let config: AuthConfig | undefined;
let transportInstalled = false;

export const authState = reactive<{
  ready: boolean;
  configured: boolean;
  authenticated: boolean;
  profile: AuthProfile | null;
  isAdmin: boolean;
  error: string;
}>({
  ready: false,
  configured: false,
  authenticated: false,
  profile: null,
  isAdmin: false,
  error: "",
});

function clearAuthState(error = "") {
  authState.authenticated = false;
  authState.profile = null;
  authState.isAdmin = false;
  authState.error = error;
}

function handleUnauthorized() {
  if (!authState.authenticated) return;
  clearAuthState(translate("登录状态已失效，请重新登录"));
  window.location.assign("/#/?login=1");
}

function installUnauthorizedHandler() {
  if (transportInstalled) return;
  transportInstalled = true;
  axios.interceptors.response.use(response => response, error => {
    if (error?.response?.status === 401) handleUnauthorized();
    return Promise.reject(error);
  });
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = new URL(typeof input === "string" || input instanceof URL ? String(input) : input.url, window.location.href);
    const response = await nativeFetch(input, init);
    if (requestUrl.origin === window.location.origin && requestUrl.pathname.startsWith("/api/") && response.status === 401) {
      handleUnauthorized();
    }
    return response;
  }) as typeof fetch;
}

function applySession(data: SessionResponse) {
  authState.authenticated = data.authenticated;
  authState.profile = data.user;
  authState.isAdmin = data.isAdmin;
}

async function loadSession() {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { data?: SessionResponse; message?: string };
  if (!response.ok || !body.data) throw new Error(body.message || translate("读取登录状态失败"));
  applySession(body.data);
}

function cleanAuthQuery() {
  const url = new URL(window.location.href);
  const authError = url.searchParams.get("authError");
  if (!authError) return "";
  url.searchParams.delete("authError");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  return authError;
}

export async function initializeAuth() {
  if (authState.ready) return;
  installUnauthorizedHandler();
  localStorage.removeItem(legacySessionKey);
  sessionStorage.removeItem(legacyVerifierKey);
  try {
    const response = await nativeFetch("/api/auth/config", { headers: { "Cache-Control": "no-cache" } });
    if (!response.ok) throw new Error(translate("读取认证配置失败（{0}）", { 0: response.status }));
    const body = await response.json() as { data: AuthConfig };
    config = body.data;
    authState.configured = config.configured;
    if (!config.configured) throw new Error(config.message || translate("Supabase 认证尚未配置"));
    await loadSession();
    const callbackError = cleanAuthQuery();
    if (callbackError) clearAuthState(callbackError);
  } catch (error) {
    clearAuthState(error instanceof Error ? error.message : translate("登录初始化失败"));
  } finally {
    authState.ready = true;
  }
}

export function signInWithOAuth(provider: string) {
  if (!config?.configured) throw new Error(config?.message || translate("Supabase 认证尚未配置"));
  window.location.assign(`/api/auth/start?provider=${encodeURIComponent(provider)}`);
}

export async function sendMagicLink(email: string) {
  if (!config?.configured) throw new Error(config?.message || translate("Supabase 认证尚未配置"));
  const response = await fetch("/api/auth/magicLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message || translate("无法发送登录链接，请稍后重试"));
}

export async function refreshAuthProfile() {
  await loadSession();
}

export async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  clearAuthState();
}

export function getAuthProviders() {
  return config?.providers ?? [];
}
