import type { Plugin } from "vite";
import { transformSource } from "./transform.ts";

export function i18nPlugin(options: { include?: RegExp } = {}): Plugin {
  const include = options.include ?? /\/apps\/web\/src\//;
  return {
    name: "toonflowI18n",
    enforce: "pre",
    transform(source, id) {
      const path = id.replaceAll("\\", "/");
      if (!include.test(path)) return;
      return transformSource(source, path);
    },
  };
}
