import type { Request, Response } from "express";
import type { AuthTokens } from "@/utils/auth/supabase";

const accessCookie = "toonflowAccess";
const refreshCookie = "toonflowRefresh";
const oauthVerifierCookie = "toonflowPkce";
const legacyOAuthCookie = "toonflowOAuth";

function secureCookie(req: Request) {
  return process.env.TOONFLOW_COOKIE_SECURE === "true" || req.secure;
}

export function readCookie(req: Request, name: string) {
  for (const part of (req.get("cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

export function readAccessToken(req: Request) {
  return readCookie(req, accessCookie);
}

export function readRefreshToken(req: Request) {
  return readCookie(req, refreshCookie);
}

export function setSessionCookies(req: Request, res: Response, tokens: AuthTokens) {
  const secure = secureCookie(req);
  res.cookie(accessCookie, tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api",
    maxAge: tokens.expiresIn * 1000,
  });
  res.cookie(refreshCookie, tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/api",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookies(req: Request, res: Response) {
  const secure = secureCookie(req);
  res.clearCookie(accessCookie, { httpOnly: true, sameSite: "lax", secure, path: "/api" });
  res.clearCookie(refreshCookie, { httpOnly: true, sameSite: "lax", secure, path: "/api" });
}

export function setOAuthVerifier(req: Request, res: Response, verifier: string) {
  clearLegacyOAuthCookies(req, res);
  res.cookie(oauthVerifierCookie, verifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(req),
    path: "/api/auth",
    maxAge: 10 * 60 * 1000,
  });
}

export function readOAuthVerifier(req: Request) {
  return readCookie(req, oauthVerifierCookie);
}

export function clearOAuthVerifier(req: Request, res: Response) {
  res.clearCookie(oauthVerifierCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(req),
    path: "/api/auth",
  });
  clearLegacyOAuthCookies(req, res);
}

function clearLegacyOAuthCookies(req: Request, res: Response) {
  const options = { httpOnly: true, sameSite: "lax" as const, secure: secureCookie(req) };
  res.clearCookie(legacyOAuthCookie, { ...options, path: "/api/auth" });
  res.clearCookie(legacyOAuthCookie, { ...options, path: "/api/auth/callback" });
}
