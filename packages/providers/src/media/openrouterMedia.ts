const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "OpenRouter API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
] as const;

const apiBase = "https://openrouter.ai/api/v1";
const version = "2.4.0";
const providerModels = [
  {
    id: "qwen/qwen-image-2.1-turbo", label: "Qwen Image 2.1 Turbo", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["1K", "2K"], maxReferences: 4, maxOutputs: 6,
    imageRatios: ["1:1", "1:2", "1:4", "2:1", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "9:16", "16:9"],
  },
  {
    id: "qwen/qwen-image-2.1-pro", label: "Qwen Image 2.1 Pro", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["1K", "2K"], maxReferences: 4, maxOutputs: 6,
    imageRatios: ["1:1", "1:2", "1:4", "2:1", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "9:16", "16:9"],
  },
  {
    id: "bytedance-seed/seedream-5-0-flash", label: "Seedream 5.0 Flash", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["1K", "2K"], maxReferences: 14, maxOutputs: 1,
    imageRatios: ["1:1", "1:2", "2:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "9:21", "21:9"],
  },
  {
    id: "black-forest-labs/flux-3-image", label: "FLUX 3 Image", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["768", "1K", "1.5K", "2K", "4K"], maxReferences: 10, maxOutputs: 1,
    imageRatios: ["21:9", "2:1", "16:9", "3:2", "4:3", "1:1", "3:4", "2:3", "9:16", "1:2"],
  },
  {
    id: "google/gemini-nano-banana-2.1", label: "Nano Banana 2.1", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["1K", "2K", "4K"], maxReferences: 14, maxOutputs: 1,
    imageRatios: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"],
  },
  {
    id: "openai/gpt-image-2", label: "GPT Image 2", type: "image",
    mode: ["text", "singleImage", "multiReference"], imageSizes: ["1K", "2K", "4K"], maxReferences: 16, maxOutputs: 10,
    imageRatios: ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"],
  },
  {
    id: "minimax/hailuo-3-max", label: "MiniMax H3 Max", type: "video",
    mode: ["text", "singleImage", "startEndRequired"], audio: false,
    imageRatios: ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"],
    durationResolutionMap: [{ duration: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "768p"] }],
  },
  {
    id: "alibaba/wan-3.0", label: "Wan 3.0", type: "video",
    mode: ["text", "singleImage", "startEndRequired"], audio: true,
    imageRatios: ["16:9", "4:3", "1:1", "3:4", "9:16"],
    durationResolutionMap: [{ duration: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], resolution: ["480p", "720p", "1080p"] }],
  },
  {
    id: "kwaivgi/kling-v3.0-std", label: "Kling 3.0 Standard", type: "video",
    mode: ["text", "singleImage", "startEndRequired"], audio: "optional",
    imageRatios: ["16:9", "1:1", "9:16"],
    durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p"] }],
  },
  {
    id: "kwaivgi/kling-v3.0-pro", label: "Kling 3.0 Pro", type: "video",
    mode: ["text", "singleImage", "startEndRequired"], audio: "optional",
    imageRatios: ["16:9", "1:1", "9:16"],
    durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p"] }],
  },
  {
    id: "bytedance/seedance-2.0-mini", label: "Seedance 2.0 Mini", type: "video",
    mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]], audio: "optional",
    imageRatios: ["1:1", "3:4", "9:16", "4:3", "16:9", "21:9", "9:21"],
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
  },
  {
    id: "bytedance/seedance-2.5", label: "Seedance 2.5", type: "video",
    mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]], audio: "optional",
    imageRatios: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], resolution: ["480p", "720p"] }],
  },
  {
    id: "bytedance/seedance-2.0", label: "Seedance 2.0", type: "video",
    mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]], audio: "optional",
    imageRatios: ["1:1", "3:4", "9:16", "4:3", "16:9", "21:9", "9:21"],
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p", "4K"] }],
  },
  {
    id: "bytedance/seedance-2.0-fast", label: "Seedance 2.0 Fast", type: "video",
    mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]], audio: "optional",
    imageRatios: ["1:1", "3:4", "9:16", "4:3", "16:9", "21:9", "9:21"],
    durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
  },
  {
    id: "google/veo-3.1-lite", label: "Veo 3.1 Lite", type: "video",
    mode: ["text", "singleImage", "startEndRequired"], audio: "optional",
    imageRatios: ["16:9", "9:16"],
    durationResolutionMap: [{ duration: [4, 6, 8], resolution: ["720p", "1080p"] }],
  },
] satisfies ProviderModel[];
const imageModels = providerModels.filter(model => model.type === "image");
const videoModels = providerModels.filter(model => model.type === "video");
const imageConfigs = new Map(imageModels.map(model => [model.id, model]));
const videoConfigs = new Map(videoModels.map(model => [model.id, model]));

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("OpenRouter 响应格式错误");
  return value as Record<string, unknown>;
}

function cost(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
}

function taskFailure(message: string) {
  return Object.assign(new Error(message), { taskTerminal: true });
}

function mediaUrl(input: MediaInput) {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

function imageMimeType(data: Uint8Array, value?: unknown) {
  if (typeof value === "string" && value.startsWith("image/")) return value;
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) return "image/gif";
  if (Buffer.from(data.subarray(0, 12)).toString("ascii") === "RIFF" && Buffer.from(data.subarray(8, 12)).toString("ascii") === "WEBP") return "image/webp";
  const text = Buffer.from(data.subarray(0, 256)).toString("utf8").trimStart();
  if (text.startsWith("<svg") || text.startsWith("<?xml")) return "image/svg+xml";
  return "";
}

async function responseError(context: ProviderContext, response: Response, fallback: string) {
  const body = await response.json().catch(() => undefined);
  return context.tool.errorMessage?.(body) || `${fallback}（HTTP ${response.status}）`;
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

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-OpenRouter-Title": "Toonflow",
  };
}

function imageAssets(result: Record<string, unknown>): MediaAsset[] {
  if (!Array.isArray(result.data) || !result.data.length) throw new Error("OpenRouter 未返回生成图片");
  return result.data.map((value) => {
    const item = object(value);
    if (typeof item.b64_json !== "string" || !item.b64_json.trim()) throw new Error("OpenRouter 未返回图片内容");
    const data = item.b64_json.trim().replace(/^data:image\/[^;,]+;base64,/i, "").replace(/\s/g, "");
    if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) throw new Error("OpenRouter 返回了无效的 Base64 图片");
    const mimeType = imageMimeType(Buffer.from(data, "base64"), item.media_type);
    if (!mimeType) throw new Error("无法识别 OpenRouter 返回图片的格式");
    return { mediaType: "image" as const, type: "base64" as const, data, mimeType };
  });
}

async function waitForVideo(
  context: ProviderContext,
  apiKey: string,
  jobId: string,
  initial: Record<string, unknown> | undefined,
  signal: AbortSignal,
): Promise<MediaAsset[]> {
  let job = initial;
  while (!job || !["completed", "failed", "cancelled", "expired"].includes(String(job.status))) {
    signal.throwIfAborted();
    await wait(signal, 5000);
    const response = await context.tool.fetch(`${apiBase}/videos/${encodeURIComponent(jobId)}`, {
      headers: headers(apiKey),
      signal,
    });
    if (!response.ok) {
      const message = await responseError(context, response, "OpenRouter 视频任务查询失败");
      throw [404, 410].includes(response.status) ? taskFailure(message) : new Error(message);
    }
    job = object(await response.json());
  }
  if (job.status !== "completed") {
    const reason = typeof job.error === "string" && job.error.trim()
      ? job.error
      : `视频生成${job.status === "failed" ? "失败" : String(job.status) === "cancelled" ? "已取消" : "已过期"}`;
    throw taskFailure(reason);
  }
  const usage = job.usage && typeof job.usage === "object" ? job.usage as Record<string, unknown> : undefined;
  const usageCost = cost(usage?.cost);
  if (usageCost !== undefined) {
    context.tool.reportUsage?.({
      costUsd: usageCost,
      ...(typeof job.generation_id === "string" ? { generationId: job.generation_id } : {}),
      ...(typeof usage?.is_byok === "boolean" ? { isByok: usage.is_byok } : {}),
    });
  }
  const contentResponse = await context.tool.fetch(`${apiBase}/videos/${encodeURIComponent(jobId)}/content?index=0`, {
    headers: headers(apiKey),
    signal,
  });
  if (!contentResponse.ok) {
    const message = await responseError(context, contentResponse, "OpenRouter 视频结果下载失败");
    throw [404, 410].includes(contentResponse.status) ? taskFailure(message) : new Error(message);
  }
  const data = new Uint8Array(await contentResponse.arrayBuffer());
  if (!data.length) throw new Error("OpenRouter 返回的视频为空");
  return [{ mediaType: "video", type: "binary", data, mimeType: contentResponse.headers.get("content-type")?.split(";")[0] || "video/mp4" }];
}

export default {
  id: "openrouterMedia",
  label: "Media Models",
  version,
  apiUrl: "https://openrouter.ai/api/v1",
  readme: `OpenRouter 图片与视频生成接口。

白名单提供 6 个图片模型和 9 个视频模型，覆盖快速、低成本、高质量、参考图和视频音频场景。图片只开放支持图像生成的模型；视频支持文生视频、单图首帧、首尾帧和混合参考，并按所选时长、分辨率和音频设置预估费用。

 \n 👉 API Key：[OpenRouter Keys](https://openrouter.ai/settings/keys)`,
  rules,
  models: providerModels,
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    this.signal?.throwIfAborted();
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 OpenRouter API Key");
    const model = imageConfigs.get(request.model);
    if (!model) throw new Error("OpenRouter 图片模型不存在，请重新选择");
    if (!request.prompt.trim()) throw new Error("请输入图片提示词");
    if (request.mask) throw new Error(`${model.label} 不支持蒙版`);
    if (request.quality !== undefined) throw new Error(`${model.label} 不支持画质参数`);
    if (request.outputFormat !== undefined) throw new Error(`${model.label} 不支持输出格式参数`);
    if (request.other && Object.keys(request.other).length) throw new Error(`${model.label} 不支持额外参数`);
    const n = request.n ?? 1;
    if (!Number.isInteger(n) || n < 1 || n > model.maxOutputs) throw new Error(`生成数量必须是 1 到 ${model.maxOutputs} 的整数`);
    if ((request.images?.length ?? 0) > model.maxReferences) throw new Error(`${model.label} 最多支持 ${model.maxReferences} 张参考图`);
    if (request.size !== undefined && !model.imageSizes.includes(request.size)) throw new Error(`${model.label} 不支持尺寸 ${request.size}`);
    if (request.ratio !== undefined && !model.imageRatios.includes(request.ratio)) throw new Error(`${model.label} 不支持比例 ${request.ratio}`);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const response = await this.tool.fetch(`${apiBase}/images`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        n,
        ...(request.size ? { size: request.size } : {}),
        ...(request.ratio ? { aspect_ratio: request.ratio } : {}),
        ...(request.images?.length ? {
          input_references: request.images.map((image) => ({ type: "image_url", image_url: { url: mediaUrl(image) } })),
        } : {}),
      }),
      signal,
    });
    if (!response.ok) throw new Error(await responseError(this, response, "OpenRouter 图片请求失败"));
    const result = object(await response.json());
    const usage = result.usage && typeof result.usage === "object" ? result.usage as Record<string, unknown> : undefined;
    const usageCost = cost(usage?.cost);
    if (usageCost !== undefined) this.tool.reportUsage?.({ costUsd: usageCost });
    return imageAssets(result);
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    this.signal?.throwIfAborted();
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 OpenRouter API Key");
    const model = videoConfigs.get(request.model);
    if (!model) throw new Error("OpenRouter 视频模型不存在，请重新选择");
    if (!request.prompt.trim()) throw new Error("请输入视频提示词");
    const referenceMode = Array.isArray(request.mode)
      ? model.mode.find(mode => Array.isArray(mode) && JSON.stringify(mode) === JSON.stringify(request.mode)) as string[] | undefined
      : undefined;
    if (Array.isArray(request.mode) && !referenceMode) throw new Error(`${model.label} 不支持当前混合参考模式`);
    if (!referenceMode && (request.videos?.length || request.audios?.length)) throw new Error(`${model.label} 当前接入不支持参考视频或参考音频`);
    if (referenceMode) {
      const counts = {
        image: request.images?.length ?? 0,
        video: request.videos?.length ?? 0,
        audio: request.audios?.length ?? 0,
      };
      for (const [type, count] of Object.entries(counts)) {
        const limit = Number(referenceMode.find(item => item.startsWith(`${type}Reference:`))?.split(":")[1] ?? 0);
        if (count > limit) throw new Error(`${model.label} 最多支持 ${limit} 个${type === "image" ? "图片" : type === "video" ? "视频" : "音频"}参考`);
      }
    }
    if (request.generateAudio && model.audio === false) throw new Error(`${model.label} 不支持生成音频`);
    if (request.watermark !== undefined) throw new Error(`${model.label} 当前接入不支持水印参数`);
    if (request.other && Object.keys(request.other).length) throw new Error(`${model.label} 不支持额外参数`);
    const durations = [...new Set(model.durationResolutionMap.flatMap(item => item.duration))];
    const resolutions = [...new Set(model.durationResolutionMap.flatMap(item => item.resolution))];
    if (request.duration !== undefined && !durations.includes(request.duration)) throw new Error(`${model.label} 不支持时长 ${request.duration}`);
    if (request.resolution !== undefined && !resolutions.includes(request.resolution)) throw new Error(`${model.label} 不支持分辨率 ${request.resolution}`);
    if (request.ratio !== undefined && !model.imageRatios.includes(request.ratio)) throw new Error(`${model.label} 不支持比例 ${request.ratio}`);
    const frames: Record<string, unknown>[] = [];
    if (request.firstFrame) frames.push({ type: "image_url", image_url: { url: mediaUrl(request.firstFrame) }, frame_type: "first_frame" });
    if (request.lastFrame) frames.push({ type: "image_url", image_url: { url: mediaUrl(request.lastFrame) }, frame_type: "last_frame" });
    if (!frames.length && request.images?.length && !referenceMode) {
      if (request.images.length !== 1) throw new Error(`${model.label} 图生视频需要一张图片或显式首尾帧`);
      frames.push({ type: "image_url", image_url: { url: mediaUrl(request.images[0]!) }, frame_type: "first_frame" });
    }
    const inputReferences = referenceMode ? [
      ...(request.images ?? []).map(image => ({ type: "image_url", image_url: { url: mediaUrl(image) } })),
      ...(request.videos ?? []).map(video => ({ type: "video_url", video_url: { url: mediaUrl(video) } })),
      ...(request.audios ?? []).map(audio => ({ type: "audio_url", audio_url: { url: mediaUrl(audio) } })),
    ] : [];
    const signal = AbortSignal.any([AbortSignal.timeout(30 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submitResponse = await this.tool.fetch(`${apiBase}/videos`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        ...(request.duration !== undefined ? { duration: request.duration } : {}),
        ...(request.resolution ? { resolution: request.resolution } : {}),
        ...(request.ratio ? { aspect_ratio: request.ratio } : {}),
        ...(model.audio !== false && request.generateAudio !== undefined ? { generate_audio: request.generateAudio } : {}),
        ...(frames.length ? { frame_images: frames } : {}),
        ...(inputReferences.length ? { input_references: inputReferences } : {}),
      }),
      signal,
    });
    if (!submitResponse.ok) throw new Error(await responseError(this, submitResponse, "OpenRouter 视频任务提交失败"));
    const job = object(await submitResponse.json());
    const jobId = typeof job.id === "string" ? job.id : "";
    if (!jobId) throw new Error("OpenRouter 视频任务未返回任务 ID");
    await this.tool.reportTask?.({ jobId });
    return waitForVideo(this, apiKey, jobId, job, signal);
  },
  async resumeVideo(jobId: string): Promise<MediaAsset[]> {
    this.signal?.throwIfAborted();
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 OpenRouter API Key");
    if (!jobId.trim() || jobId.length > 256) throw new Error("OpenRouter 视频任务 ID 无效");
    const signal = AbortSignal.any([AbortSignal.timeout(30 * 60_000), ...(this.signal ? [this.signal] : [])]);
    return waitForVideo(this, apiKey, jobId, undefined, signal);
  },
  async getPrice(request) {
    this.signal?.throwIfAborted();
    if (request.type === "image") {
      const config = imageConfigs.get(request.model);
      if (!config) return null;
      const modelPath = config.id.split("/").map(encodeURIComponent).join("/");
      const response = await this.tool.fetch(`${apiBase}/images/models/${modelPath}/endpoints`,
        { signal: this.signal });
      if (!response.ok) throw new Error(await responseError(this, response, "OpenRouter 图片价格查询失败"));
      const model = object(await response.json());
      const endpoints = Array.isArray(model.endpoints) ? model.endpoints.map(object) : [];
      const prices = endpoints.flatMap(endpoint => Array.isArray(endpoint.pricing) ? endpoint.pricing.map(object) : []);
      const outputPrices = prices.filter(item => item.billable === "output_image" && item.unit === "image");
      if (!outputPrices.length) return null;
      const defaultSize = config.imageSizes.find(size => size.toLowerCase() === "1k") ?? config.imageSizes[0];
      const variant = (request.size ?? defaultSize)?.toLowerCase();
      const matching = outputPrices.filter(item => variant && typeof item.variant === "string" && item.variant.toLowerCase() === variant);
      const unvaried = outputPrices.filter(item => item.variant === undefined);
      const selectedPrices = matching.length ? matching : unvaried.length ? unvaried : outputPrices;
      const unitPrice = selectedPrices.reduce((highest, item) => Math.max(highest, cost(item.cost_usd) ?? 0), 0);
      if (!unitPrice) return null;
      const inputPrices = prices.filter(item => item.billable === "input_image" && item.unit === "image");
      const inputPrice = inputPrices.reduce((highest, item) => Math.max(highest, cost(item.cost_usd) ?? 0), 0);
      const total = unitPrice * (request.n ?? 1) + inputPrice * (request.images?.length ?? 0);
      return { price: `约 $${total.toFixed(4)}`, tips: `按 ${request.n ?? 1} 张图片和 ${request.images?.length ?? 0} 张参考图估算，实际费用以完成为准。`, costUsd: total };
    }
    if (request.type !== "video") return null;
    const config = videoConfigs.get(request.model);
    if (!config) return null;
    const response = await this.tool.fetch(`${apiBase}/videos/models`, { signal: this.signal });
    if (!response.ok) throw new Error(await responseError(this, response, "OpenRouter 视频价格查询失败"));
    const payload = object(await response.json());
    const models = Array.isArray(payload.data) ? payload.data.map(object) : [];
    const model = models.find(item => item.id === config.id);
    const skus = model?.pricing_skus && typeof model.pricing_skus === "object" ? model.pricing_skus as Record<string, unknown> : {};
    const durations = [...new Set(config.durationResolutionMap.flatMap(item => item.duration))].sort((left, right) => left - right);
    const resolutions = [...new Set(config.durationResolutionMap.flatMap(item => item.resolution))];
    const resolution = request.resolution?.toLowerCase() ?? resolutions[0]?.toLowerCase();
    const withAudio = config.audio === false ? false : request.generateAudio ?? true;
    const priceKeys = [
      resolution && withAudio ? `duration_seconds_with_audio_${resolution}` : undefined,
      resolution && !withAudio ? `duration_seconds_without_audio_${resolution}` : undefined,
      resolution ? `duration_seconds_${resolution}` : undefined,
      withAudio ? "duration_seconds_with_audio" : undefined,
      !withAudio ? "duration_seconds_without_audio" : undefined,
      "duration_seconds",
    ];
    let unitPrice: number | undefined;
    for (const key of priceKeys) {
      if (!key) continue;
      unitPrice = cost(skus[key]);
      if (unitPrice !== undefined) break;
    }
    if (unitPrice === undefined) return null;
    const duration = request.duration ?? durations[0] ?? 5;
    const total = unitPrice * duration;
    return {
      price: `约 $${total.toFixed(4)}`,
      tips: `按 ${duration} 秒${resolution ? `、${resolution}` : ""}${config.audio === false ? "" : withAudio ? "、含音频" : "、不含音频"} 估算，实际费用以完成为准。`,
      costUsd: total,
    };
  },
} satisfies ProviderDefinition<typeof rules>;
