<template>
  <el-dialog v-model="visible" title="FFmpeg" width="min(680px, calc(100vw - 32px))" alignCenter appendToBody destroyOnClose>
    <el-alert class="installationHint" title="安装完成后，请重新发起刚才的操作。" type="info" :closable="false" showIcon />
    <ffmpeg v-if="visible" :downloadOnOpen="true" />
  </el-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { isMobile, isRemoteMobile } from "@/lib/platform";
import { authState } from "@/lib/auth";
import { openEventStream } from "@/lib/eventStream";
import ffmpeg from "./panels/pluginMarket/ffmpeg.vue";

const visible = ref(false);
let pending = false;
let active = true;
const events = authState.isAdmin ? openEventStream("/api/ffmpeg/events", { onMessage: handleEvent }) : undefined;
async function handleEvent(message: string) {
  let data: { type?: string };
  try { data = JSON.parse(message); }
  catch { return; }
  if (data?.type !== "required" || pending || visible.value) return;
  if (isMobile && !isRemoteMobile) {
    ElMessage.warning("未检测到可用 FFmpeg，当前移动端版本暂不支持在应用内安装，这项音视频处理无法继续。");
    return;
  }
  pending = true;
  try {
    await ElMessageBox.confirm("当前操作需要 FFmpeg，但尚未检测到可用版本。是否下载并安装？", "需要 FFmpeg", {
      confirmButtonText: "下载并安装", cancelButtonText: "暂不下载", closeOnClickModal: false,
    });
    if (active) visible.value = true;
  } catch {
    // 用户取消后保留当前操作的失败结果，不自动重新生成媒体。
  } finally {
    pending = false;
  }
}
onBeforeUnmount(() => {
  active = false;
  events?.close();
});
</script>

<style scoped>
.installationHint { margin-bottom: 12px; }
</style>
