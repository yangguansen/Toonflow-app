const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
] as const;

const endpoint = "https://www.autodl.art/api/v1/images/generations";
const version = "2.0.0";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("AutoDL 图片接口响应格式错误");
  return value as Record<string, unknown>;
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

function imageAsset(value: unknown): MediaAsset {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value)) return { mediaType: "image", type: "url", url: value };
    const dataUrl = /^data:(image\/[^;,]+);base64,([\s\S]+)$/i.exec(value);
    if (dataUrl) return { mediaType: "image", type: "base64", data: dataUrl[2]!.replace(/\s/g, ""), mimeType: dataUrl[1]! };
    throw new Error("AutoDL 图片接口返回了无效的图片字符串");
  }

  const item = object(value);
  const directUrl = item.url ?? item.image_url;
  if (typeof directUrl === "string" && /^https?:\/\//i.test(directUrl)) {
    return { mediaType: "image", type: "url", url: directUrl };
  }
  const nestedUrl = object(item.image_url ?? {}).url;
  if (typeof nestedUrl === "string" && /^https?:\/\//i.test(nestedUrl)) {
    return { mediaType: "image", type: "url", url: nestedUrl };
  }

  const base64 = item.b64_json ?? item.base64;
  if (typeof base64 === "string" && base64.trim()) {
    const data = base64.trim().replace(/^data:image\/[^;,]+;base64,/i, "").replace(/\s/g, "");
    if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(data) || data.length % 4 === 1) throw new Error("AutoDL 图片接口返回了无效的 Base64 图片");
    const mimeType = imageMimeType(Buffer.from(data, "base64"), item.mime_type ?? item.mimeType);
    if (!mimeType) throw new Error("无法识别 AutoDL 返回图片的格式");
    return { mediaType: "image", type: "base64", data, mimeType };
  }

  throw new Error("AutoDL 图片接口未返回图片地址或 Base64 图片");
}

function supportedSize(model: string, size: string | undefined, ratio: string | undefined) {
  const sizes = model === "Qwen-Image"
    ? { "1:1": "1328x1328", "16:9": "1664x928" }
    : { "1:1": "1024x1024" };
  const ratios = Object.keys(sizes);
  const requestedRatio = ratio ?? "1:1";
  if (!ratios.includes(requestedRatio)) throw new Error(`模型 ${model} 不支持比例 ${requestedRatio}，可选：${ratios.join("、")}`);
  if (!size || size === "1K") return sizes[requestedRatio as keyof typeof sizes];
  if (!Object.values(sizes).includes(size)) throw new Error(`模型 ${model} 不支持尺寸 ${size}，可选：1K、${Object.values(sizes).join("、")}`);
  if (sizes[requestedRatio as keyof typeof sizes] !== size) throw new Error(`尺寸 ${size} 与比例 ${requestedRatio} 不匹配`);
  return size;
}

export default {
  id: "autodlImage",
  label: "AutoDL 图片生成",
  version,
  apiUrl: "https://www.autodl.art/api/v1/images/generations",
  readme: `AutoDL.Art 的大模型图片生成接口，支持文本生成图片。

API Key 请在 [令牌管理](https://autodl.art/large-model/tokens) 中获取。当前接入官方文档明确列出的 Qwen-Image 与 Z-Image-Turbo 模型，每次只能生成 1 张图片，不支持参考图、蒙版或图生图参数。

 \n 👉 接口文档：[Qwen-Image](https://www.autodl.art/docs/Qwen-Image/) · [Z-Image-Turbo](https://www.autodl.art/docs/Z-Image-Turbo/)`,
  rules,
  models: [
    {
      id: "Qwen-Image",
      label: "Qwen-Image（文生图）",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K"],
      imageRatios: ["1:1", "16:9"],
    },
    {
      id: "Z-Image-Turbo",
      label: "Z-Image-Turbo（文生图）",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K"],
      imageRatios: ["1:1"],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    this.signal?.throwIfAborted();
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    if (!request.prompt.trim()) throw new Error("请输入图片提示词");
    if (request.model !== "Qwen-Image" && request.model !== "Z-Image-Turbo") throw new Error("AutoDL 图片模型不存在，请重新选择");
    if (request.images?.length) throw new Error("当前 AutoDL 图片模型不支持参考图");
    if (request.mask) throw new Error("当前 AutoDL 图片模型不支持蒙版");
    if (request.quality !== undefined) throw new Error("当前 AutoDL 图片模型不支持画质参数");
    if (request.outputFormat !== undefined) throw new Error("当前 AutoDL 图片模型不支持输出格式参数");
    if (request.other && Object.keys(request.other).length) throw new Error("当前 AutoDL 图片模型不支持额外参数");
    if (request.n !== undefined && request.n !== 1) throw new Error("AutoDL 图片模型每次只能生成 1 张图片");
    const size = supportedSize(request.model, request.size, request.ratio);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const response = await this.tool.fetch(endpoint, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: request.model, prompt: request.prompt, n: 1, size }),
      signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      let detail = this.tool.errorMessage?.(body) || `AutoDL 图片请求失败（HTTP ${response.status}）`;
      if (detail.includes("模型不存在或已被删除")) detail += "\n请确认 AutoDL 令牌分组支持该图片模型，不要复用 ComfyUI 分组令牌。";
      throw new Error(detail);
    }
    const result = object(await response.json());
    const images = Array.isArray(result.data) ? result.data : Array.isArray(result.images) ? result.images : result.data ?? result.image ?? result.url;
    const items = Array.isArray(images) ? images : [images];
    const assets = items.filter(item => item !== undefined && item !== null).map(imageAsset);
    if (!assets.length) throw new Error("AutoDL 图片接口未返回生成图片");
    return assets;
  },
} satisfies ProviderDefinition<typeof rules>;
