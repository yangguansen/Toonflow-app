import { AsyncLocalStorage } from "node:async_hooks";
import type { Request } from "express";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import conf from "@/utils/conf";
import type { AuthUser } from "@/utils/auth/supabase";

const authStorage = new AsyncLocalStorage<AuthUser>();

export function getAuthUser(req: Request) {
  if (!req.authUser) throw Object.assign(new Error("请先登录"), { status: 401, code: "UNAUTHORIZED" });
  return req.authUser;
}

export function getCurrentAuthUser() {
  const user = authStorage.getStore();
  if (!user) throw Object.assign(new Error("当前请求缺少用户身份"), { status: 401, code: "UNAUTHORIZED" });
  return user;
}

export function runWithAuthUser<T>(user: AuthUser, callback: () => T): T {
  return authStorage.run(user, callback);
}

export function assertAdmin(req: Request) {
  const user = getAuthUser(req);
  if (!user.isAdmin) throw Object.assign(new Error("仅管理员可以修改平台供应商、模型或插件配置"), { status: 403, code: "ADMIN_REQUIRED" });
  return user;
}

function assertIdentifier(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw Object.assign(new Error(`${label}无效`), { status: 400 });
  }
}

export function getDataDirectory() {
  return dirname(conf.path);
}

export function getAccountDirectory(userId: string) {
  assertIdentifier(userId, "用户 ID");
  return join(getDataDirectory(), "accounts", userId);
}

export function getAccountAssetsDirectory(userId: string) {
  return join(getAccountDirectory(userId), "assets");
}

export function getAccountIdForWorkspace(directory: string) {
  const parts = relative(getDataDirectory(), resolve(directory)).split(sep);
  if (parts.length !== 4 || parts[0] !== "accounts" || parts[2] !== "projects") {
    throw Object.assign(new Error("工作区不属于当前用户"), { status: 403 });
  }
  return parts[1]!;
}

export function getProjectDirectory(userId: string, projectId: string) {
  assertIdentifier(userId, "用户 ID");
  assertIdentifier(projectId, "项目 ID");
  return join(getAccountDirectory(userId), "projects", projectId);
}

export function isInside(root: string, path: string) {
  const offset = relative(root, resolve(path));
  return offset === "" || offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset);
}
