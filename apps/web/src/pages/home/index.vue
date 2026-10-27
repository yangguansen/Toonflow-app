<template>
  <div class="home" :class="{ sidebarCollapsed }" :inert="creating || opening || workspaceStore.projectLoadingVisible">
    <bg class="pageBackground" :scrollTop="backgroundScrollTop" />
    <aside id="homeSidebar" class="homeSidebar" aria-label="首页侧栏">
      <div class="sidebarHeader">
        <div class="sidebarBrand">
          <el-image class="sidebarLogo" :src="logoUrl" fit="contain" alt="AI classroom" />
          <span class="brandName">AI classroom</span>
        </div>
        <button class="sidebarToggle" type="button" :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'" :title="sidebarCollapsed ? '展开侧栏' : '收起侧栏'" :aria-expanded="!sidebarCollapsed" aria-controls="homeSidebar" @click="sidebarCollapsed = !sidebarCollapsed">
          <icon-layout-sidebar-left-expand v-if="sidebarCollapsed" :size="18" aria-hidden="true" />
          <icon-layout-sidebar-left-collapse v-else :size="18" aria-hidden="true" />
        </button>
      </div>
      <nav class="sidebarNav" aria-label="首页导航">
            <button v-for="section in homeSections" :key="section.id" class="sidebarItem" :class="{ active: activeSection === section.id }" type="button" :aria-current="activeSection === section.id ? 'location' : undefined" :aria-label="translate(section.label)" :title="translate(section.label)" @click="scrollToSection(section.id)">
          <component :is="section.icon" :size="18" aria-hidden="true" />
          <span class="sidebarText">{{ translate(section.label) }}</span>
        </button>
        <hr class="sidebarDivider" />
        <button class="sidebarItem" :class="{ active: assetsVisible }" type="button" aria-label="素材库" title="素材库" aria-haspopup="dialog" :aria-expanded="assetsVisible" @click="assetsVisible = true">
          <icon-library-photo :size="18" aria-hidden="true" />
          <span class="sidebarText">素材库</span>
        </button>
      </nav>
      <div class="sidebarFooter">
        <div v-if="creditSummary?.enabled || creditError" class="sidebarCredits">
          <creditBalance />
        </div>
        <button class="sidebarItem" type="button" :aria-label="hasDesktopUpdate ? '设置，有新版本可用' : '设置'" :title="hasDesktopUpdate ? '设置，有新版本可用' : '设置'" @click="settingsVisible = true">
          <span class="sidebarIcon">
            <icon-settings :size="18" aria-hidden="true" />
            <span v-if="hasDesktopUpdate" class="updateDot" />
          </span>
          <span class="sidebarText">设置</span>
        </button>
        <button class="sidebarItem" type="button" :aria-label="`退出登录，当前账号 ${authState.profile?.displayName || authState.profile?.email || ''}`" :title="authState.profile?.email || '退出登录'" @click="logout">
          <icon-logout :size="18" aria-hidden="true" />
          <span class="sidebarText">{{ authState.profile?.displayName || authState.profile?.email || "退出登录" }}</span>
        </button>
      </div>
    </aside>
    <el-scrollbar ref="pageScroll" class="pageScroll" @scroll="updateActiveSection">
      <div class="pageBody">
        <el-main class="pageContent">
          <section class="creationPanel" data-home-section="home" aria-label="创建项目">
            <div class="brand">
              <el-image class="brandLogo" :src="logoUrl" fit="contain" alt="AI classroom" />
              <h1>今天要做点什么？</h1>
            </div>
            <div class="promptArea">
              <el-card class="promptCard" :class="{ draggingAttachments }" shadow="never" @dragenter.capture="dragEnterAttachments" @dragover.capture="dragOverAttachments" @dragleave.capture="dragLeaveAttachments" @drop.capture="dropAttachments">
                <div v-if="draggingAttachments" class="attachmentDropOverlay" role="status" aria-live="polite">
                  <icon-paperclip :size="20" aria-hidden="true" />
                  <strong>松开添加附件</strong>
                  <span>图片、视频、文档或代码文件</span>
                </div>
                <input ref="attachmentInput" type="file" :accept="attachmentAccept" multiple hidden :disabled="creating || opening" @change="selectAttachments" />
                <attachmentList v-if="promptAttachments.length" class="promptAttachments" :attachments="promptAttachments" removable restorable :disabled="creating || opening" @remove="promptAttachments.splice($event, 1)" @restore="restoreAttachment" />
                <el-input ref="promptInput" v-model="prompt" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" resize="none" :disabled="creating || opening" :placeholder="promptPlaceholder" aria-label="创作描述" @paste.capture="pasteAttachments" />
                <template #footer>
                  <div class="composerFooter">
                    <div class="composerTools">
                      <el-button class="attachmentButton" text circle :icon="IconPaperclip" :disabled="creating || opening" aria-label="添加附件" title="添加附件" @click="attachmentInput?.click()" />
                    </div>
                    <div class="sendActions">
                      <modelPopover v-model="selectedModel" v-model:reasoningEffort="reasoningEffort" class="modelSelect" :disabled="creating || opening" />
                      <el-button class="sendButton" type="primary" circle :icon="IconArrowUp" :loading="creating" :disabled="creating || opening" aria-label="开始创作" title="开始创作" @click="createProject()" />
                    </div>
                  </div>
                </template>
              </el-card>
              <p class="workspaceHint" role="status">项目会创建在当前账号的独立空间，画布和素材由服务端自动保存。</p>
            </div>
          </section>
          <section class="projectList" data-home-section="projects" aria-labelledby="projectListTitle">
            <h2 id="projectListTitle">项目</h2>
            <div class="projectItems">
              <el-card class="projectCard" shadow="never" :bodyStyle="{ padding: '0', height: '100%' }">
                <button class="projectLaunch" type="button" :disabled="creating || opening" :aria-busy="creating" title="新建项目" @click="createProject(false)">
                  <span class="launchIcon">
                    <icon-loader-2 v-if="creating" class="isLoading" :size="24" aria-hidden="true" />
                    <icon-plus v-else :size="24" aria-hidden="true" />
                  </span>
                  <span class="launchText">
                    <span class="launchTitle">新建项目</span>
                    <span class="launchDescription">创建独立创作空间</span>
                  </span>
                </button>
              </el-card>
              <el-card v-for="project in sortedProjects" :key="project.id" class="projectCard" shadow="never" :bodyStyle="{ padding: '0', height: '100%' }">
                <button class="projectEntry" type="button" :disabled="creating || opening" :title="project.directory" :aria-label="`打开项目 ${project.name}`" @click="openProject(project)">
                  <projectCover :directory="project.directory" />
                  <span class="projectInfo">
                    <span class="projectName" :title="project.name">{{ project.name }}</span>
                    <span class="projectTime">最近打开 {{ new Date(project.lastOpenedAt).toLocaleString(locale, { hour12: false }) }}</span>
                  </span>
                </button>
                <div class="projectActions">
                  <el-button circle :icon="IconEdit" :disabled="creating || opening" :aria-label="`重命名项目 ${project.name}`" title="重命名" @click="renameProject(project)" />
                  <el-button circle plain type="danger" :icon="IconTrash" :disabled="creating || opening" :aria-label="`移除项目 ${project.name}`" title="从列表移除，不删除文件" @click="removeProject(project)" />
                </div>
              </el-card>
            </div>
          </section>
        </el-main>
      </div>
    </el-scrollbar>
    <assetLibraryDialog v-model="assetsVisible" />
    <settings v-model="settingsVisible" />
  </div>
</template>

<script setup lang="ts">
import { locale, translate } from "@toonflow/i18n/vue";
import axios from "axios";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox, type InputInstance, type ScrollbarInstance } from "element-plus";
import { getReadableFileMimeType, readableFileAccept } from "@toonflow/server/documentFormats";
import {
  IconHome,
  IconArrowUp, IconPlus, IconLoader2,
  IconFolder, IconEdit,
  IconTrash, IconPaperclip, IconLogout,
} from "@tabler/icons-vue";
import modelPopover from "@/components/modelPopover.vue";
import attachmentList from "@/components/agent/attachmentList.vue";
import { createPastedTextFile, readTextAttachment } from "@/components/agent/textAttachments";
import type { AgentAttachment } from "@/components/agent/types";
import logoUrl from "@toonflow/assets/logo.svg";
import { useWorkspaceStore, type Project } from "@/stores/workspace";
import { authState, signOut } from "@/lib/auth";
import { resetSettings } from "@/stores/settings";
import { hasDesktopUpdate } from "@/stores/desktopUpdate";
import { waitForControlValue } from "@/lib/mcpControl";
import settings from "@/components/settings/index.vue";
import assetLibraryDialog from "./assetLibraryDialog.vue";
import bg from "./bg.vue";
import projectCover from "./projectCover.vue";
import creditBalance from "@/components/credits/creditBalance.vue";
import { creditError, creditSummary, refreshCredits, waitForCreditPurchase } from "@/lib/credits";

const settingsVisible = ref(false);
const assetsVisible = ref(false);
const sidebarCollapsed = ref(false);
const pageScroll = ref<ScrollbarInstance>();
const backgroundScrollTop = ref(0);
const activeSection = ref("home");
const homeSections = [
  { id: "home", label: "首页", icon: IconHome },
  { id: "projects", label: "项目", icon: IconFolder },
];
const router = useRouter();
const route = useRoute();
const pageLifetime = new AbortController();
const creating = ref(false);
const opening = ref(false);
const prompt = ref("");
const promptInput = ref<InputInstance>();
const promptAttachments = ref<AgentAttachment[]>([]);
const attachmentInput = ref<HTMLInputElement>();
const attachmentAccept = `image/*,video/*,${readableFileAccept}`;
const draggingAttachments = ref(false);
let attachmentDragDepth = 0;
const workspaceStore = useWorkspaceStore();
const { project, projectList } = storeToRefs(workspaceStore);
const placeholderPhrases = [
  "描述你想创作的内容，让灵感从这里开始…",
  "把一个故事灵感，变成一段精彩的短片…",
  "为你的主角设计独特的外形和性格…",
  "创作一段雨夜街头的电影感镜头…",
  "把这段文字拆解成连贯的分镜画面…",
  "为一场奇幻冒险生成场景和角色…",
  "为你的画面配上一段合适的音乐…",
  "写一段温暖的旁白，讲述这个故事…",
  "设计一支富有想象力的产品宣传片…",
  "从一句话开始，搭建你的创作工作流…",
];
const promptPlaceholder = ref(translate(placeholderPhrases[0]!));

onMounted(() => {
  window.addEventListener("dragend", clearAttachmentDrag, true);
  window.addEventListener("drop", clearAttachmentDrag, true);
  window.addEventListener("blur", clearAttachmentDrag);
  window.addEventListener("toonflow:credits-changed", refreshCredits);
  void loadProjects();
  void refreshCredits();
  void handleCreditCheckoutReturn();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let phraseIndex = 0;
  watch([() => !!prompt.value, locale], ([hasInput], _previous, onCleanup) => {
    if (reduceMotion) {
      promptPlaceholder.value = translate(placeholderPhrases[0]!);
      return;
    }
    if (hasInput) return;
    const segmenter = new Intl.Segmenter(locale.value, { granularity: "grapheme" });
    const phrases = placeholderPhrases.map(phrase => [...segmenter.segment(translate(phrase))].map(part => part.segment));
    let characterCount = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    promptPlaceholder.value = "";

    function typePlaceholder() {
      const phrase = phrases[phraseIndex]!;
      characterCount += deleting ? -1 : 1;
      promptPlaceholder.value = phrase.slice(0, characterCount).join("");
      let delay = deleting ? 35 : 85;
      if (characterCount === phrase.length) {
        deleting = true;
        delay = 1800;
      } else if (characterCount === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % placeholderPhrases.length;
        delay = 300;
      }
      timer = setTimeout(typePlaceholder, delay);
    }

    timer = setTimeout(typePlaceholder, 300);
    onCleanup(() => clearTimeout(timer));
  }, { immediate: true });
});

async function handleCreditCheckoutReturn() {
  const checkout = route.query.checkout;
  const sessionId = route.query.session_id;
  if (checkout !== "success" && checkout !== "cancelled") return;

  const query = { ...route.query };
  delete query.checkout;
  delete query.session_id;
  await router.replace({ query });

  if (checkout === "cancelled") {
    ElMessage.info(translate("已取消支付"));
    return;
  }
  if (typeof sessionId !== "string" || !sessionId) {
    ElMessage.warning(translate("支付已完成，请在积分面板刷新余额"));
    return;
  }

  try {
    const purchase = await waitForCreditPurchase(sessionId);
    await refreshCredits();
    if (purchase.processed) {
      ElMessage.success(translate("{0} 积分已到账", {
        0: new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(purchase.credits),
      }));
    } else {
      ElMessage.warning(translate("支付已完成，积分到账可能稍有延迟，请稍后刷新"));
    }
  } catch (error) {
    ElMessage.error(axios.isAxiosError<{ message?: string }>(error)
      ? error.response?.data?.message || error.message
      : error instanceof Error ? error.message : translate("查询支付结果失败"));
  }
}

onUnmounted(() => {
  pageLifetime.abort();
  if (router.currentRoute.value.path !== "/workspace") workspaceStore.projectLoading = false;
  window.removeEventListener("dragend", clearAttachmentDrag, true);
  window.removeEventListener("drop", clearAttachmentDrag, true);
  window.removeEventListener("blur", clearAttachmentDrag);
  window.removeEventListener("toonflow:credits-changed", refreshCredits);
});
watch([creating, opening], ([creating, opening]) => {
  if (creating || opening) {
    clearAttachmentDrag();
    workspaceStore.projectLoadingDrawn = false;
    workspaceStore.projectLoading = true;
  } else if (router.currentRoute.value.path !== "/workspace") {
    workspaceStore.projectLoading = false;
  }
}, { flush: "sync" });

const selectedModel = ref("");
const reasoningEffort = ref("");
const sortedProjects = computed(() => [...projectList.value].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt));

function scrollToSection(section: string) {
  const wrap = pageScroll.value?.wrapRef;
  const target = wrap?.querySelector<HTMLElement>(`[data-home-section="${section}"]`);
  if (!wrap || !target) return;
  activeSection.value = section;
  pageScroll.value?.scrollTo({
    top: section === "home" ? 0 : wrap.scrollTop + target.getBoundingClientRect().top - wrap.getBoundingClientRect().top - 32,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
}

function updateActiveSection() {
  const wrap = pageScroll.value?.wrapRef;
  if (!wrap) return;
  backgroundScrollTop.value = wrap.scrollTop;
  const top = wrap.getBoundingClientRect().top + 120;
  for (const section of wrap.querySelectorAll<HTMLElement>("[data-home-section]")) {
    if (section.getBoundingClientRect().top <= top) activeSection.value = section.dataset.homeSection!;
  }
}

function pasteAttachments(event: ClipboardEvent) {
  if (creating.value || opening.value) return;
  try {
    const files = Array.from(event.clipboardData?.files ?? []);
    if (!files.length) {
      const file = createPastedTextFile(event.clipboardData?.getData("text/plain") ?? "");
      if (file) files.push(file);
    }
    if (!files.length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    addAttachments(files);
  } catch (error) {
    event.preventDefault();
    event.stopImmediatePropagation();
    ElMessage.error(error instanceof Error ? error.message : "添加附件失败，请重试");
  }
}

function selectAttachments(event: Event) {
  const input = event.target as HTMLInputElement;
  addAttachments(Array.from(input.files ?? []));
  input.value = "";
}

function clearAttachmentDrag() {
  attachmentDragDepth = 0;
  draggingAttachments.value = false;
}

function dragEnterAttachments(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  event.stopPropagation();
  if (creating.value || opening.value) return clearAttachmentDrag();
  attachmentDragDepth++;
  draggingAttachments.value = true;
}

function dragOverAttachments(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = creating.value || opening.value ? "none" : "copy";
  if (creating.value || opening.value) return clearAttachmentDrag();
  attachmentDragDepth = Math.max(1, attachmentDragDepth);
  draggingAttachments.value = true;
}

function dragLeaveAttachments(event: DragEvent) {
  if (!draggingAttachments.value) return;
  attachmentDragDepth = Math.max(0, attachmentDragDepth - 1);
  const target = event.currentTarget;
  if (!attachmentDragDepth || (target instanceof Node && event.relatedTarget instanceof Node && !target.contains(event.relatedTarget))) clearAttachmentDrag();
}

function dropAttachments(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  event.stopPropagation();
  clearAttachmentDrag();
  addAttachments(Array.from(event.dataTransfer.files));
}

function addAttachments(files: File[]) {
  if (creating.value || opening.value) return;
  for (const file of files) {
    const readableMimeType = getReadableFileMimeType(file.name, file.type);
    const mimeType = readableMimeType ?? file.type.split(";")[0]!.trim().toLowerCase();
    if (!readableMimeType && !/^(image|video)\//.test(mimeType)) {
      ElMessage.warning("只支持图片、视频和受支持的文本或文档文件");
      continue;
    }
    if (!file.size || file.size > 100 * 1024 * 1024) {
      ElMessage.warning("附件不能为空且不能超过 100 MB");
      continue;
    }
    if (mimeType === "text/plain" && file.size > 400000) {
      ElMessage.warning("文本附件不能超过 400000 字节");
      continue;
    }
    if (promptAttachments.value.length >= 20) {
      ElMessage.warning("每条消息最多添加 20 个附件");
      break;
    }
    promptAttachments.value.push({ name: file.name, path: "", mimeType, file });
  }
}

async function restoreAttachment(index: number) {
  const attachment = promptAttachments.value[index];
  if (attachment?.mimeType !== "text/plain" || creating.value || opening.value) return;
  try {
    const text = await readTextAttachment(attachment);
    const currentIndex = promptAttachments.value.indexOf(attachment);
    if (currentIndex < 0 || creating.value || opening.value) return;
    prompt.value += `${prompt.value ? "\n" : ""}${text}`;
    promptAttachments.value.splice(currentIndex, 1);
    await nextTick();
    promptInput.value?.focus();
    promptInput.value?.textarea?.setSelectionRange(prompt.value.length, prompt.value.length);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "取回文本失败，请重试");
  }
}

async function enterWorkspace() {
  await waitForControlValue(() => workspaceStore.projectLoadingDrawn || undefined, pageLifetime.signal).catch(error => {
    if (!pageLifetime.signal.aborted) throw error;
  });
  if (pageLifetime.signal.aborted) return;
  if (!document.hidden) await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (pageLifetime.signal.aborted) return;
  await router.push("/workspace");
}

async function openProject(project: Project) {
  if (creating.value || opening.value) return;
  opening.value = true;
  try {
    await workspaceStore.openProject(project.id);
    await enterWorkspace();
  } catch (err) {
    ElMessage.error(axios.isAxiosError<{ message?: string }>(err)
      ? err.response?.data.message || "无法打开项目，请重试"
      : err instanceof Error ? err.message : "无法打开项目，请重试");
  } finally { opening.value = false; }
}

async function renameProject(project: Project) {
  const result = await ElMessageBox.prompt("请输入项目名称", "重命名项目", {
    inputValue: project.name, confirmButtonText: "保存", cancelButtonText: "取消",
    inputValidator: value => !!value?.trim() || "项目名称不能为空",
  }).catch(() => null);
  if (!result) return;
  try {
    await workspaceStore.renameProject(project.id, result.value);
  } catch (error) {
    ElMessage.error(axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message || "重命名项目失败" : "重命名项目失败");
  }
}

async function createProject(fromPrompt = true) {
  if (creating.value || opening.value) return;
  const result = await ElMessageBox.prompt("请输入项目名称", fromPrompt ? "开始创作" : "新建项目", {
    inputValue: "未命名项目",
    confirmButtonText: "创建",
    cancelButtonText: "取消",
    inputValidator: value => !!value?.trim() || "项目名称不能为空",
  }).catch(() => null);
  if (!result || pageLifetime.signal.aborted) return;
  creating.value = true;
  try {
    await workspaceStore.createProject(result.value.trim(), pageLifetime.signal);
    if (fromPrompt && (prompt.value.trim() || promptAttachments.value.length)) {
      workspaceStore.pendingAgentMessage = { directory: workspaceStore.project!.directory, prompt: prompt.value, attachments: [...promptAttachments.value], model: selectedModel.value, reasoningEffort: reasoningEffort.value };
    }
    await enterWorkspace();
  } catch (err) {
    ElMessage.error(axios.isAxiosError<{ message?: string }>(err)
      ? err.response?.data.message || "无法打开或创建项目，请重试"
      : err instanceof Error ? err.message : "无法打开或创建项目，请重试");
  } finally {
    creating.value = false;
  }
}

async function loadProjects() {
  try {
    await workspaceStore.loadProjectList(pageLifetime.signal);
  } catch (error) {
    if (!pageLifetime.signal.aborted) ElMessage.error(axios.isAxiosError<{ message?: string }>(error)
      ? error.response?.data.message || "读取项目列表失败"
      : "读取项目列表失败");
  }
}

async function removeProject(project: Project) {
  try {
    await workspaceStore.removeProject(project.id);
  } catch (error) {
    ElMessage.error(axios.isAxiosError<{ message?: string }>(error) ? error.response?.data.message || "移除项目失败" : "移除项目失败");
  }
}

async function logout() {
  const confirmed = await ElMessageBox.confirm(translate("请确认是否退出登录。"), translate("确认退出登录"), {
    type: "warning",
    confirmButtonText: translate("退出登录"),
    cancelButtonText: translate("取消"),
    closeOnClickModal: false,
  }).then(() => true, () => false);
  if (!confirmed) return;
  await signOut();
  resetSettings();
  workspaceStore.project = null;
  workspaceStore.projectList = [];
  workspaceStore.pendingAgentMessage = null;
  await router.replace("/login");
}
</script>

<style lang="scss" scoped>
.home {
  --sidebarWidth: 240px;
  --sidebarMotion: 220ms;
  --sidebarFade: 140ms;
  position: relative;
  display: flex;
  height: 100dvh;
  overflow: hidden;
  color: var(--el-text-color-primary);
  background: color-mix(in srgb, var(--el-bg-color) 96%, var(--el-text-color-primary));

  .pageBackground {
    position: absolute;
    inset-block: 0;
    inset-inline-start: var(--sidebarWidth);
    width: calc(100% - var(--sidebarWidth));
    transition: inset-inline-start var(--sidebarMotion) ease, width var(--sidebarMotion) ease;

    @media (prefers-reduced-motion: reduce) { transition: none; }
  }

  &.sidebarCollapsed {
    --sidebarWidth: 72px;

    .homeSidebar {
      .sidebarHeader {
        .sidebarBrand {
          gap: 0;

          .brandName { max-width: 0; opacity: 0; }
        }

        .sidebarToggle { inset-inline-start: 9px; opacity: 0; }

        @media (min-width: 901px) {
          &:hover, &:has(.sidebarToggle:focus-visible) {
            .sidebarLogo { opacity: 0; }
            .sidebarToggle { opacity: 1; }
          }
        }
      }

      .sidebarItem {
        gap: 0;
        padding-inline: 14px;

        .sidebarText { max-width: 0; opacity: 0; }
      }

      .sidebarCredits {
        :deep(.creditTrigger) {
          justify-content: center;
          padding-inline: 0;
        }
        :deep(.creditText) { display: none; }
      }
    }
  }

  .homeSidebar {
    display: flex;
    flex: 0 0 var(--sidebarWidth);
    flex-direction: column;
    width: var(--sidebarWidth);
    padding: 20px 12px 16px;
    overflow-x: hidden;
    overflow-y: auto;
    border-inline-end: 1px solid var(--el-border-color-lighter);
    background: inherit;
    transition: flex-basis var(--sidebarMotion) ease, width var(--sidebarMotion) ease;

    .sidebarHeader {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      height: 30px;
      gap: 8px;
      margin-bottom: 24px;
      padding: 0 8px;

      .sidebarBrand {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 9px;
        overflow: hidden;
        transition: gap var(--sidebarMotion) ease;

        .sidebarLogo {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          transition: opacity var(--sidebarFade) ease;

          .dark & { filter: invert(1); }
        }

        .brandName {
          max-width: 150px;
          overflow: hidden;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.5px;
          white-space: nowrap;
          transition: max-width var(--sidebarMotion) ease, opacity var(--sidebarFade) ease;
        }
      }

      .sidebarToggle {
        position: absolute;
        top: 1px;
        inset-inline-start: calc(100% - 32px);
        display: grid;
        flex-shrink: 0;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: var(--ui-radius);
        background: transparent;
        color: var(--el-text-color-secondary);
        cursor: pointer;
        transition: inset-inline-start var(--sidebarMotion) ease, opacity var(--sidebarFade) ease;

        &:hover { background: var(--el-fill-color); color: var(--el-text-color-primary); }
        &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
        &:dir(rtl) svg { transform: scaleX(-1); }
      }
    }

    .sidebarItem {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      min-height: 42px;
      width: 100%;
      gap: 10px;
      padding: 10px 12px;
      border: 0;
      border-radius: var(--ui-radius);
      background: transparent;
      color: var(--el-text-color-regular);
      font: inherit;
      font-size: 14px;
      line-height: 1.5;
      text-align: start;
      text-decoration: none;
      cursor: pointer;
      transition: gap var(--sidebarMotion) ease, padding var(--sidebarMotion) ease;

      > svg { flex-shrink: 0; }
      .sidebarText {
        min-width: 0;
        max-width: 180px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        transition: max-width var(--sidebarMotion) ease, opacity var(--sidebarFade) ease;
      }

      .sidebarIcon {
        position: relative;
        display: inline-flex;
        flex-shrink: 0;

        .updateDot {
          position: absolute;
          top: -2px;
          inset-inline-end: -3px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--el-color-danger);
          box-shadow: 0 0 0 2px var(--el-bg-color);
        }
      }

      &:hover:not(:disabled) { background: var(--el-fill-color); color: var(--el-text-color-primary); }
      &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: 2px; }
      &:disabled { cursor: wait; opacity: 0.6; }
      &.active { background: var(--el-fill-color-darker); color: var(--el-text-color-primary); font-weight: 500; }
    }

    .sidebarNav, .sidebarFooter { display: flex; flex-direction: column; gap: 4px; }
    .sidebarNav {
      .sidebarDivider { margin: 12px 8px; border: 0; border-top: 1px solid var(--el-border-color-lighter); }
    }
    .sidebarFooter { margin-top: auto; padding-top: 24px; }
    .sidebarCredits {
      width: 100%;

      :deep(.creditTrigger) {
        justify-content: flex-start;
        width: 100%;
        min-height: 42px;
        padding: 10px 12px;
        border-radius: var(--ui-radius);
        font-size: 14px;
      }
      :deep(.creditTrigger > span) {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      :deep(.creditText) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      --sidebarMotion: 0ms;
      --sidebarFade: 0ms;
    }
  }

  .pageScroll {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;

    :deep(.el-scrollbar__view) { min-height: 100%; }

    .pageBody {
      position: relative;
      min-height: 100dvh;

      .pageContent {
        padding: 24px clamp(20px, 4vw, 56px) 56px;

        .creationPanel {
          max-width: 800px;
          margin: clamp(32px, 6vh, 64px) auto 56px;

          .brand {
            display: flex;
            align-items: center;
            gap: clamp(8px, 1vw, 12px);
            margin-bottom: 28px;

            .brandLogo {
              flex-shrink: 0;
              width: clamp(28px, 3.4vw, 44px);
              height: clamp(28px, 3.4vw, 44px);

              .dark & {
                filter: invert(1);
              }
            }

            h1 {
              margin: 0;
              font-size: clamp(22px, 3vw, 34px);
              font-weight: 500;
              line-height: 1.3;
              letter-spacing: -0.5px;
            }
          }

          .promptArea {
            position: relative;

            .promptCard {
              position: relative;
              border-radius: calc(var(--ui-radius) * 3);
              border-color: var(--el-border-color-light);
              background: var(--el-bg-color-overlay);
              box-shadow: 0 12px 36px rgb(0 0 0 / 6%), inset 0 1px 0 color-mix(in srgb, var(--el-text-color-primary) 4%, transparent);
              transition: border-color 0.2s, box-shadow 0.2s;

              &:focus-within, &.draggingAttachments {
                border-color: var(--el-color-primary-light-5);
                box-shadow: 0 12px 36px rgb(0 0 0 / 6%), 0 0 0 3px color-mix(in srgb, var(--el-color-primary) 8%, transparent);
              }

              :deep(.el-card__body) {
                padding: 20px 22px 8px;
              }

              .attachmentDropOverlay {
                position: absolute;
                inset: 0;
                z-index: 2;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                border-radius: inherit;
                background: var(--el-bg-color);
                color: var(--el-text-color-primary);
                pointer-events: none;

                > svg { color: var(--el-text-color-secondary); }
                strong { font-size: 14px; font-weight: 500; }
                span { color: var(--el-text-color-secondary); font-size: 12px; }
              }

              .promptAttachments {
                margin-bottom: 12px;
              }

              :deep(.el-textarea__inner) {
                padding: 4px 0;
                box-shadow: none;
                background: transparent;
                font-size: 15px;
                line-height: 1.9;
              }

              :deep(.el-card__footer) {
                padding: 8px 14px 14px;
                border-top: 0;
                background: transparent;
              }

              .composerFooter {
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;

                .composerTools {
                  display: flex;
                  align-items: center;
                  flex: 1 1 160px;
                  min-width: 0;
                  gap: 6px;

                  .attachmentButton {
                    flex-shrink: 0;
                    width: 36px;
                    height: 36px;
                    margin: 0;
                    background: var(--el-fill-color-light);
                    color: var(--el-text-color-regular);

                    &:hover:not(:disabled) {
                      background: var(--el-color-primary-light-9);
                      color: var(--el-color-primary);
                    }
                  }

                  :deep(.workspaceButton) {
                    max-width: calc(100% - 42px);
                    height: 36px;
                    margin: 0;
                    padding: 0 10px;
                    border-radius: calc(var(--ui-radius) * 2);
                    color: var(--el-text-color-secondary);
                  }
                }

                .sendActions {
                  display: flex;
                  align-items: center;
                  justify-content: flex-end;
                  min-width: 0;
                  max-width: 100%;
                  margin-inline-start: auto;
                  gap: 8px;

                  .modelSelect {
                    min-width: 0;
                    max-width: 280px;

                    :deep(.modelButton) {
                      height: 36px;
                      border-radius: calc(var(--ui-radius) * 2);
                    }
                  }

                  .sendButton {
                    flex-shrink: 0;
                    height: 38px;
                    margin: 0;
                    border-radius: calc(var(--ui-radius) * 2);

                    &.is-circle { width: 38px; border-radius: 50%; }
                  }
                }

                @media (max-width: 560px) {
                  .composerTools { flex-basis: 100%; }

                  .sendActions {
                    width: 100%;
                    justify-content: space-between;

                    .modelSelect { flex: 1; }
                  }
                }
              }

              @media (prefers-reduced-motion: reduce) {
                transition: none;
              }
            }

            .workspaceHint {
              margin: 12px 16px 0;
              color: var(--el-text-color-secondary);
              font-size: 12px;
              line-height: 1.7;
            }
          }
        }

        .projectList {
          max-width: 1280px;
          margin: 0 auto;

          h2 {
            margin: 0 0 20px;
            font-size: 22px;
            font-weight: 600;
            line-height: 1.5;
          }

          .projectItems {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
            grid-auto-rows: 1fr;
            gap: 20px;

            .projectCard {
              position: relative;
              border-radius: calc(var(--ui-radius) * 2.5);
              border-color: var(--el-border-color-lighter);
              box-shadow: var(--el-box-shadow-lighter);

              &:focus-within {
                border-color: var(--el-color-primary-light-5);
              }

              .projectLaunch, .projectEntry {
                width: 100%;
                height: 100%;
                min-height: 240px;
                border: 0;
                border-radius: calc(var(--ui-radius) * 2.5);
                background: transparent;
                color: inherit;
                font: inherit;
                cursor: pointer;

                &:focus-visible { outline: 2px solid var(--el-color-primary); outline-offset: -2px; }
                &:disabled { cursor: wait; opacity: 0.6; }
              }

              .projectLaunch {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 20px;
                text-align: center;

                .launchIcon {
                  display: grid;
                  place-items: center;
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  background: var(--el-color-primary);
                  color: var(--el-color-white);

                  .isLoading { animation: launchSpin 1.5s linear infinite; }

                  @media (prefers-reduced-motion: reduce) {
                    .isLoading { animation: none; }
                  }
                }

                .launchText {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;

                  .launchTitle { font-size: 15px; font-weight: 500; line-height: 1.8; }
                  .launchDescription { color: var(--el-text-color-regular); font-size: 13px; line-height: 1.6; }
                }
              }

              .projectEntry {
                display: flex;
                flex-direction: column;
                padding: 0;
                text-align: start;

                .projectInfo {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  width: 100%;
                  min-width: 0;
                  margin-top: auto;
                  padding: 12px 16px;
                  border-top: 1px solid var(--el-border-color-lighter);
                  background: var(--el-fill-color-extra-light);

                  .projectName {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.5;
                  }

                  .projectTime { font-size: 12px; line-height: 1.6; color: var(--el-text-color-secondary); }
                }
              }

              .projectActions {
                position: absolute;
                top: 12px;
                right: 12px;
                display: flex;
                gap: 4px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;

                .el-button {
                  width: 32px;
                  height: 32px;
                  margin: 0;
                  padding: 0;
                  box-shadow: var(--el-box-shadow-lighter);
                }
              }

              &:hover .projectActions, &:focus-within .projectActions { opacity: 1; pointer-events: auto; }

              @media (hover: none), (any-pointer: coarse) {
                .projectActions { opacity: 1; pointer-events: auto; }
              }

              @media (prefers-reduced-motion: reduce) {
                .projectActions { transition: none; }
              }
            }
          }
        }
      }
    }
  }

  @media (max-width: 900px) {
    --sidebarWidth: 72px;

    .homeSidebar {
      .sidebarHeader {
        .sidebarBrand {
          gap: 0;

          .brandName { max-width: 0; opacity: 0; }
        }

        .sidebarToggle { display: none; }
      }

      .sidebarItem {
        gap: 0;
        padding-inline: 14px;

        .sidebarText { max-width: 0; opacity: 0; }
      }
    }
  }

  @media (max-width: 560px) {
    .pageScroll .pageBody .pageContent { padding: 24px 16px 40px; }
    .homeSidebar .sidebarItem { min-height: 44px; }
  }
}
@keyframes launchSpin {
  to { transform: rotate(360deg); }
}
</style>
