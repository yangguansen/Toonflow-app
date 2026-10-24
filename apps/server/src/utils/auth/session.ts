import type { Request, Response } from "express";
import {
  isAccessTokenExpiring,
  refreshAuthTokens,
  verifyAccessToken,
  type AuthUser,
} from "@/utils/auth/supabase";
import {
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
  setSessionCookies,
} from "@/utils/auth/cookies";

async function verify(token: string) {
  return verifyAccessToken(token);
}

export async function resolveRequestAuth(req: Request, res: Response): Promise<AuthUser | undefined> {
  const accessToken = readAccessToken(req);
  const refreshToken = readRefreshToken(req);
  if (!accessToken && !refreshToken) return undefined;

  if (accessToken && !isAccessTokenExpiring(accessToken)) {
    try {
      return await verify(accessToken);
    } catch (error) {
      if ((error as { status?: number }).status !== 401 || !refreshToken) throw error;
    }
  }

  if (refreshToken) {
    try {
      const tokens = await refreshAuthTokens(refreshToken);
      setSessionCookies(req, res, tokens);
      return await verify(tokens.accessToken);
    } catch (error) {
      if (accessToken) {
        try { return await verify(accessToken); }
        catch { /* 继续清理失效会话。 */ }
      }
      if ((error as { status?: number }).status !== 401) throw error;
    }
  } else if (accessToken) {
    try {
      return await verify(accessToken);
    } catch (error) {
      if ((error as { status?: number }).status !== 401) throw error;
    }
  }

  clearSessionCookies(req, res);
  return undefined;
}
