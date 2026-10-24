export function openEventStream(url: string, handlers: {
  onOpen?(): void;
  onMessage(message: string): void;
  onError?(): void;
}) {
  const controller = new AbortController();
  let closed = false;
  void (async () => {
    const response = await fetch(url, { headers: { Accept: "text/event-stream" }, signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`事件通知连接失败（${response.status}）`);
    handlers.onOpen?.();
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let pending = "";
    let data: string[] = [];
    try {
      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += value;
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
          if (line || !data.length) continue;
          handlers.onMessage(data.join("\n"));
          data = [];
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!closed) handlers.onError?.();
  })().catch(() => {
    if (!closed) handlers.onError?.();
  });
  return {
    close() {
      closed = true;
      controller.abort();
    },
  };
}
