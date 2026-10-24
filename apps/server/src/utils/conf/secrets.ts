const secretKeyPattern = /(?:api.?key|(?:access|refresh|auth)?token|password|secret|authorization|cookie|credential)$/i;

export function redactSettings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSettings);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) =>
    [key, secretKeyPattern.test(key) ? "" : redactSettings(item)]));
}
