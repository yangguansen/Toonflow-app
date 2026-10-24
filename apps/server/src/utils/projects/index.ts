import { randomUUID } from "node:crypto";
import { mkdir, realpath, rm, writeAtomic } from "@toonflow/file";
import { join, relative, resolve } from "node:path";
import { databaseRequest, type AuthUser } from "@/utils/auth/supabase";
import { getAccountDirectory, getProjectDirectory, isInside } from "@/utils/auth/context";

type ProjectRow = {
  id: string;
  name: string;
  last_opened_at: string;
  created_at: string;
  updated_at: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  directory: string;
  lastOpenedAt: number;
  createdAt: string;
  updatedAt: string;
};

function normalizeName(name: string) {
  const value = name.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80);
  if (!value) throw Object.assign(new Error("项目名称不能为空"), { status: 400 });
  return value;
}

function mapProject(user: AuthUser, row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    directory: getProjectDirectory(user.id, row.id),
    lastOpenedAt: Date.parse(row.last_opened_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function projectQuery(user: AuthUser, query: string) {
  return databaseRequest(user.accessToken, `projects?owner_id=eq.${encodeURIComponent(user.id)}&archived_at=is.null&${query}`);
}

export async function listProjects(user: AuthUser) {
  const response = await projectQuery(user, "select=id,name,last_opened_at,created_at,updated_at&order=last_opened_at.desc");
  return (await response.json() as ProjectRow[]).map(row => mapProject(user, row));
}

export async function getProject(user: AuthUser, projectId: string) {
  const response = await projectQuery(user, `id=eq.${encodeURIComponent(projectId)}&select=id,name,last_opened_at,created_at,updated_at&limit=1`);
  const row = (await response.json() as ProjectRow[])[0];
  if (!row) throw Object.assign(new Error("项目不存在或无权访问"), { status: 404, code: "PROJECT_NOT_FOUND" });
  return mapProject(user, row);
}

export async function createProject(user: AuthUser, name: string, initializeCanvas = true) {
  const projectId = randomUUID();
  const directory = getProjectDirectory(user.id, projectId);
  await mkdir(join(getAccountDirectory(user.id), "projects"), { recursive: true });
  await mkdir(directory);
  try {
    if (initializeCanvas) {
      await writeAtomic(join(directory, "画布1.json"), `${JSON.stringify({
        toonflowCanvas: true,
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      }, null, 2)}\n`, { exclusive: true });
    }
    const response = await databaseRequest(user.accessToken, "projects", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ id: projectId, owner_id: user.id, name: normalizeName(name) }),
    });
    const row = (await response.json() as ProjectRow[])[0];
    if (!row) throw new Error("项目创建后未返回记录");
    return mapProject(user, row);
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(cleanupError => {
      console.error(`项目创建失败后清理目录失败：${directory}`, cleanupError);
    });
    throw error;
  }
}

export async function openProject(user: AuthUser, projectId: string) {
  await getProject(user, projectId);
  const response = await databaseRequest(user.accessToken, `projects?id=eq.${encodeURIComponent(projectId)}&owner_id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ last_opened_at: new Date().toISOString() }),
  });
  const row = (await response.json() as ProjectRow[])[0];
  if (!row) throw Object.assign(new Error("项目不存在或无权访问"), { status: 404 });
  const project = mapProject(user, row);
  const directory = await realpath(project.directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") throw Object.assign(new Error("项目目录不存在，请联系管理员检查数据卷"), { status: 404 });
    throw error;
  });
  if (directory !== project.directory) throw Object.assign(new Error("项目目录无效"), { status: 403 });
  return { ...project, directory };
}

export async function renameProject(user: AuthUser, projectId: string, name: string) {
  await getProject(user, projectId);
  const response = await databaseRequest(user.accessToken, `projects?id=eq.${encodeURIComponent(projectId)}&owner_id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: normalizeName(name) }),
  });
  const row = (await response.json() as ProjectRow[])[0];
  if (!row) throw Object.assign(new Error("项目不存在或无权访问"), { status: 404 });
  return mapProject(user, row);
}

export async function archiveProject(user: AuthUser, projectId: string) {
  await getProject(user, projectId);
  const response = await databaseRequest(user.accessToken, `projects?id=eq.${encodeURIComponent(projectId)}&owner_id=eq.${encodeURIComponent(user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ archived_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error("项目归档失败");
}

export function assertProjectDirectory(user: AuthUser, directory: string) {
  const projectRoot = join(getAccountDirectory(user.id), "projects");
  const requested = resolve(directory);
  const projectId = relative(projectRoot, requested);
  if (!isInside(projectRoot, requested) || projectId.includes("/") || projectId.includes("\\") || !projectId) {
    throw Object.assign(new Error("项目目录无效或不属于当前用户"), { status: 403 });
  }
  const expected = getProjectDirectory(user.id, projectId);
  if (requested !== expected) throw Object.assign(new Error("项目目录无效或不属于当前用户"), { status: 403 });
  return projectId;
}

export async function resolveOwnedProjectDirectory(user: AuthUser, directory: string) {
  const projectId = assertProjectDirectory(user, directory);
  const project = await getProject(user, projectId);
  const actual = await realpath(project.directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") throw Object.assign(new Error("项目目录不存在"), { status: 404 });
    throw error;
  });
  if (actual !== project.directory) throw Object.assign(new Error("项目目录无效"), { status: 403 });
  return actual;
}
