const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "请求地址",
    value: "https://autodl.art/api/v1/comfyui",
    props: { placeholder: "https://autodl.art/api/v1/comfyui" },
  },
  {
    type: "input",
    field: "workflowId" as const,
    title: "工作流 ID",
    value: "minimax_h3_zm_u08",
    props: { placeholder: "minimax_h3_zm_u08" },
  },
] as const;

const version = "1.2.0";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AutoDL 响应格式错误");
  return value as Record<string, unknown>;
}

function mediaUrl(input: MediaInput) {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

function wait(signal: AbortSignal, ms: number) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** 从 results 数组中提取首个可用的视频地址；兼容字符串项与含 url 字段的对象项。 */
function extractVideoUrl(results: unknown): string | undefined {
  if (!Array.isArray(results)) return undefined;
  for (const item of results) {
    if (typeof item === "string" && item) return item;
    if (item && typeof item === "object") {
      const url = (item as { url?: unknown }).url;
      if (typeof url === "string" && url) return url;
    }
  }
  return undefined;
}

/** AutoDL 以字符串 code（如 "Success"）表示结果；非成功时返回可读的 msg，避免把真实原因吞成通用错误。 */
function ensureSuccess(context: ProviderContext, result: Record<string, unknown>) {
  const code = String(result.code ?? "");
  if (code && code.toLowerCase() !== "success") {
    const detail = context.tool.errorMessage?.(result) || (typeof result.msg === "string" && result.msg.trim() ? result.msg.trim() : code);
    throw new Error(`提交任务失败：${detail}`);
  }
}

async function pollVideo(context: ProviderContext, baseUrl: string, apiKey: string, taskId: string, signal: AbortSignal): Promise<string> {
  while (true) {
    const response = await context.tool.fetch(`${baseUrl}/comfyui_workflow/result/${taskId}`, {
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      signal,
    });
    if (!response.ok) throw new Error(`查询任务失败：HTTP ${response.status}`);
    const result = object(await response.json());
    const data = object(result.data ?? {});
    const status = String(data.status ?? "").toUpperCase();
    if (status === "SUCCESS") {
      const url = extractVideoUrl(data.results);
      if (!url) throw new Error("视频生成成功但未返回视频地址");
      return url;
    }
    if (status === "FAILED") {
      throw new Error(context.tool.errorMessage?.(result) || (typeof result.msg === "string" && result.msg.trim() ? result.msg.trim() : "视频生成失败"));
    }
    await wait(signal, 5000);
  }
}

export default {
  id: "autodl",
  label: "AutoDL ComfyUI MiniMax H3",
  version,
  readme: `AutoDL.Art 的 ComfyUI 工作流 API，将 MiniMax H3 等工作流封装为两步异步调用：提交任务拿 task_id，再轮询结果地址。

在「令牌管理」创建令牌（分组选择 ComfyUI），填入 API Key；在工作流右侧抽屉查看「工作流 ID」及其可用参数。

注意：不同工作流接受的 resolution 取值不同（后端按 options 列表校验），且多数工作流要求参考图 ref_image_0。请在工作流抽屉中确认 resolution 的合法取值，并在下方模型的「分辨率」中填入完全一致的值。

 \n 👉 令牌管理：https://autodl.art/large-model/tokens
 \n 👉 接口文档：https://autodl.art/docs/comfyui_api/`,
  rules,
  models: [
    {
      id: "MiniMax-H3",
      label: "MiniMax-H3 (图生视频)",
      type: "video",
      // ACT: 该工作流要求 ref_image_0，按图生视频单图参考模式暴露；参考图数量上限 9（ref_image_0..8）。
      mode: ["singleImage", ["imageReference:9", "audioReference:3"]],
      audio: "optional",
      // ACT: resolution 取值由各工作流的 options 列表决定；minimax_h3_zm_u08 经接口校验仅接受 768p竖、768p横。
      durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["768p竖", "768p横"] }],
    },
  ] satisfies ProviderModel[],
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://autodl.art/api/v1/comfyui").replace(/\/$/, "");
    const workflowId = this.config.workflowId?.trim();
    if (!workflowId) throw new Error("请填写工作流 ID");

    // ACT: 参考图依次映射 ref_image_0..8，参考音频映射 ref_audio_0..2；首帧并入参考图首位。
    const images = [
      ...(request.firstFrame ? [request.firstFrame] : []),
      ...(request.images ?? []),
    ].map(mediaUrl).slice(0, 9);
    const audios = (request.audios ?? []).map(mediaUrl).slice(0, 3);

    const body: Record<string, unknown> = { prompt: request.prompt };
    if (request.duration !== undefined) body.duration = request.duration;
    if (request.resolution !== undefined && request.resolution !== "") body.resolution = request.resolution;
    images.forEach((url, index) => { body[`ref_image_${index}`] = url; });
    audios.forEach((url, index) => { body[`ref_audio_${index}`] = url; });

    // ACT: 单次生成最多等待 10 分钟。
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submitResponse = await this.tool.fetch(`${baseUrl}/comfyui_workflow/${workflowId}`, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!submitResponse.ok) throw new Error(`提交任务失败：HTTP ${submitResponse.status}`);
    const submitResult = object(await submitResponse.json());
    // ACT: AutoDL 出错时仍返回 HTTP 200，但 code 非 Success 且 data 为空；显式抛出其 msg，避免误报“未返回任务 ID”。
    ensureSuccess(this, submitResult);
    const submitData = object(submitResult.data ?? {});
    const taskId = submitData.task_id;
    if (typeof taskId !== "string" || !taskId) {
      const detail = this.tool.errorMessage?.(submitResult) || (typeof submitResult.msg === "string" && submitResult.msg.trim() ? submitResult.msg.trim() : "");
      throw new Error(detail ? `提交任务未返回任务 ID：${detail}` : "提交任务未返回任务 ID");
    }

    const videoUrl = await pollVideo(this, baseUrl, apiKey, taskId, signal);
    return [{ mediaType: "video", type: "url", url: videoUrl }];
  },
} satisfies ProviderDefinition<typeof rules>;
