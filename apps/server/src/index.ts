import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { readFile, readdir } from "@toonflow/file";
import { createApp } from "./app";

async function hashPluginDirectory(hash: ReturnType<typeof createHash>, directory: string, path = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await hashPluginDirectory(hash, resolve(directory, entry.name), relativePath);
    else if (entry.isFile()) {
      hash.update(`${relativePath}\0`);
      hash.update(await readFile(resolve(directory, entry.name)));
      hash.update("\0");
    }
  }
}

async function readPluginRevision(appDirectory: string) {
  const hash = createHash("sha256");
  for (const type of ["nodes", "tools", "ext", "providers"])
    await hashPluginDirectory(hash, resolve(appDirectory, "build", type), type);
  return hash.digest("hex");
}

const startTime = Date.now();
const bootTime = new Date();
const realPort = Number(process.env.TOONFLOW_SERVER_PORT || 3000);
if (!Number.isInteger(realPort) || realPort < 1 || realPort > 65535) throw new Error("TOONFLOW_SERVER_PORT 必须是 1–65535 之间的整数");
// 源码位于 apps/server/src，生产构建位于 build/server，均从文件位置定位根目录。
const fromSource = import.meta.path.endsWith(".ts");
const appDirectory = resolve(import.meta.dirname, fromSource ? "../../.." : "../..");
const dataDirectory = process.env.TOONFLOW_DATA_DIR ?? resolve(appDirectory, "data");
const pluginRevision = fromSource ? undefined : await readPluginRevision(appDirectory);
const app = await createApp({
  webRoot: resolve(appDirectory, "build/web"),
  appVersion: process.env.TOONFLOW_APP_VERSION ?? "2.0.0",
  dataDirectory,
  toolsRoot: resolve(appDirectory, "build/tools"),
  nodesRoot: resolve(appDirectory, "build/nodes"),
  extRoot: resolve(appDirectory, "build/ext"),
  // ACT: 暂不安装内置团队，随团队打包一同恢复。
  // agentsRoot: resolve(appDirectory, "build/agents"),
  providersRoot: resolve(appDirectory, fromSource ? "packages/providers/src" : "build/providers"),
  skillsRoot: resolve(appDirectory, fromSource ? "packages/skills" : "build/skills"),
  pluginRevision,
});
const { initializeMcpRuntime } = await import("./utils/mcp/runtime");
const { startMobileLinkRuntime } = await import("./utils/mobileLink");
app.listen(realPort, async (error?: Error) => {
  if (error) throw error;
  await initializeMcpRuntime(app, `http://127.0.0.1:${realPort}`, resolve(appDirectory, fromSource ? "packages/mcp/src/stdio.ts" : "build/mcp/stdio.js"));
  await startMobileLinkRuntime(app).catch(error => console.error("设备互联启动失败：", error));
  const { startMediaTaskRecovery } = await import("./utils/media/recovery");
  startMediaTaskRecovery(bootTime);
  console.log(`[服务启动成功]: http://localhost:${realPort}`);
  console.log(`[启动耗时]: ${(Date.now() - startTime).toFixed(2)}ms`);
});
