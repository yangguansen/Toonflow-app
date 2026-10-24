/// <reference path="./types.d.ts" />

import deepSeek from "./src/language/deepSeek";
import openrouterMedia from "./src/media/openrouterMedia";

export type Provider = ProviderDefinition;
export type ProviderPrice = NonNullable<Awaited<ReturnType<NonNullable<Provider["getPrice"]>>>>;
export type ProviderPriceRequest = Parameters<NonNullable<Provider["getPrice"]>>[0];
export type ProviderPriceReference = NonNullable<ProviderPriceRequest["images"]>[number];
export type ProviderBalance = Awaited<ReturnType<NonNullable<Provider["getBalance"]>>>;
export type ProviderTools = ProviderContext["tool"];
export type ProviderUsage = Parameters<NonNullable<ProviderTools["reportUsage"]>>[0];
export type ProviderTask = Parameters<NonNullable<ProviderTools["reportTask"]>>[0];
export type AudioConvertOptions = Parameters<ProviderTools["audio"]["convert"]>[1];
export type { FfmpegFactory, FfmpegCommand } from "@toonflow/ffmpeg/types";

export const languageProviders: readonly Provider[] = [deepSeek];
export const mediaProviders: readonly Provider[] = [openrouterMedia];
