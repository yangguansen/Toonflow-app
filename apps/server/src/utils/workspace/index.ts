import type { Request } from "express";
import { getAuthUser } from "@/utils/auth/context";
import { resolveOwnedProjectDirectory } from "@/utils/projects";

export function isLocalWorkspaceRequest(req: Request) {
  return req.authUser?.isAdmin === true;
}

export async function resolveWorkspace(req: Request, path: string) {
  return resolveOwnedProjectDirectory(getAuthUser(req), path);
}
