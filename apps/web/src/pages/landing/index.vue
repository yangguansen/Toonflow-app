<template>
  <div class="landingPage">
    <header class="siteHeader">
      <div class="headerInner">
        <button class="brand" type="button" :aria-label="copy.homeLabel" @click="scrollToSection('top')">
          <img class="brandLogo" src="/favicon.ico" alt="" @load="usePngFavicon" @error="usePngFavicon" />
          <span>AI classroom</span>
        </button>
        <nav class="headerNav" :aria-label="copy.navigationLabel">
          <button type="button" @click="scrollToSection('capabilities')">{{ copy.capabilitiesNav }}</button>
          <button type="button" @click="scrollToSection('workflow')">{{ copy.workflowNav }}</button>
        </nav>
        <div class="headerActions">
          <div class="languageAction"><languageSelect popover /></div>
          <button class="workspaceButton" type="button" @click="enterWorkspace">
            <span>Workspace</span>
            <icon-arrow-up-right :size="17" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <main id="top">
      <section class="hero" aria-labelledby="heroTitle">
        <div class="heroCopy" data-reveal>
          <p class="eyebrow"><span class="statusDot" aria-hidden="true" /> {{ copy.heroEyebrow }}</p>
          <h1 id="heroTitle">{{ copy.heroTitleLead }}<br /><span>{{ copy.heroTitleAccent }}</span></h1>
          <p class="heroDescription">{{ copy.heroDescription }}</p>
          <div class="heroActions">
            <button class="primaryAction" type="button" @click="enterWorkspace">
              {{ copy.enterWorkspace }}
              <icon-arrow-right :size="18" aria-hidden="true" />
            </button>
            <button class="secondaryAction" type="button" @click="scrollToSection('workflow')">{{ copy.learnWorkflow }}</button>
          </div>
          <ul class="capabilityTags" :aria-label="copy.capabilityTagsLabel">
            <li v-for="tag in copy.capabilityTags" :key="tag">{{ tag }}</li>
          </ul>
        </div>

        <div class="heroVisual" data-reveal>
          <div class="workspaceStage">
            <div class="workspaceWindow">
              <div class="windowBar" aria-hidden="true">
                <span class="windowDots"><i /><i /><i /></span>
                <span class="windowProject"><icon-vector :size="13" /> {{ copy.workspaceProject }}</span>
                <span class="windowStatus">{{ copy.autosaved }}</span>
              </div>
              <img class="heroImage" :src="landingCanvas" :alt="copy.heroImageAlt" />
            </div>
            <div class="floatingNode scriptNode" aria-hidden="true">
              <span class="nodeIcon"><icon-file-text :size="15" /></span>
              <span><small>{{ copy.scriptNode }}</small>{{ copy.scriptNodeDetail }}</span>
            </div>
            <div class="floatingNode videoNode" aria-hidden="true">
              <span class="nodeIcon"><icon-player-play :size="15" /></span>
              <span><small>{{ copy.videoNode }}</small>{{ copy.videoNodeDetail }}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" class="capabilities" aria-labelledby="capabilitiesTitle">
        <div class="sectionHeading" data-reveal>
          <p class="sectionKicker">{{ copy.capabilitiesKicker }}</p>
          <h2 id="capabilitiesTitle">{{ copy.capabilitiesTitleLead }}<br />{{ copy.capabilitiesTitleAccent }}</h2>
          <p>{{ copy.capabilitiesDescription }}</p>
        </div>

        <article class="featureRow" data-reveal>
          <div class="featureCopy">
            <span class="featureNumber">{{ copy.scriptFeature.number }}</span>
            <h3>{{ copy.scriptFeature.title }}</h3>
            <p>{{ copy.scriptFeature.description }}</p>
            <ul>
              <li v-for="point in copy.scriptFeature.points" :key="point"><icon-check :size="16" /> {{ point }}</li>
            </ul>
          </div>
          <div class="featureMedia scriptMedia" :aria-label="copy.scriptFeature.mediaLabel">
            <div class="nodeWindow">
              <div class="nodeWindowBar">
                <span><icon-file-text :size="15" /> {{ copy.scriptFeature.nodeName }}</span>
                <span>{{ copy.scriptFeature.format }}</span>
              </div>
              <div class="scriptBody">
                <p class="scriptScene">{{ copy.scriptFeature.scene }}</p>
                <p>{{ copy.scriptFeature.action }}</p>
                <p><strong>{{ copy.scriptFeature.shotLabel }}</strong>{{ copy.scriptFeature.shot }}</p>
                <div class="scriptChips" aria-hidden="true">
                  <span>{{ copy.scriptFeature.style }}</span>
                  <span># 16:9</span>
                  <span>{{ copy.scriptFeature.camera }}</span>
                </div>
              </div>
            </div>
            <div class="mediaGlow" />
          </div>
        </article>

        <article class="featureRow reverse" data-reveal>
          <div class="featureCopy">
            <span class="featureNumber">{{ copy.imageFeature.number }}</span>
            <h3>{{ copy.imageFeature.title }}</h3>
            <p>{{ copy.imageFeature.description }}</p>
            <ul>
              <li v-for="point in copy.imageFeature.points" :key="point"><icon-check :size="16" /> {{ point }}</li>
            </ul>
          </div>
          <div class="featureMedia screenshotMedia">
            <div class="screenshotFrame">
              <div class="screenshotBar" aria-hidden="true">
                <span><icon-photo :size="14" /> {{ copy.imageFeature.assetLabel }}</span>
                <span>{{ copy.imageFeature.canvasLabel }}</span>
              </div>
              <img :src="landingCharacter" :alt="copy.imageFeature.imageAlt" loading="lazy" />
            </div>
            <span class="mediaLabel"><icon-sparkles :size="14" /> {{ copy.imageFeature.mediaLabel }}</span>
          </div>
        </article>

        <article class="featureRow" data-reveal>
          <div class="featureCopy">
            <span class="featureNumber">{{ copy.videoFeature.number }}</span>
            <h3>{{ copy.videoFeature.title }}</h3>
            <p>{{ copy.videoFeature.description }}</p>
            <ul>
              <li v-for="point in copy.videoFeature.points" :key="point"><icon-check :size="16" /> {{ point }}</li>
            </ul>
          </div>
          <div class="featureMedia videoMedia">
            <div class="directorFrame">
              <img :src="landingDirector" :alt="copy.videoFeature.directorAlt" loading="lazy" />
            </div>
            <div class="videoFrame">
              <img :src="landingVideo" :alt="copy.videoFeature.videoAlt" loading="lazy" />
            </div>
            <span class="mediaLabel"><icon-player-play :size="14" /> {{ copy.videoFeature.mediaLabel }}</span>
          </div>
        </article>
      </section>

      <section id="workflow" class="workflowSection" aria-labelledby="workflowTitle">
        <div class="workflowIntro" data-reveal>
          <p class="sectionKicker">{{ copy.workflowKicker }}</p>
          <h2 id="workflowTitle">{{ copy.workflowTitleLead }}<br />{{ copy.workflowTitleAccent }}</h2>
        </div>
        <ol class="workflowSteps" data-reveal>
          <li v-for="(step, index) in copy.workflowSteps" :key="step.title">
            <span class="stepNumber">{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="stepIcon"><component :is="workflowIcons[index]" :size="20" /></span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <section class="finalCta" aria-labelledby="finalCtaTitle" data-reveal>
        <div class="ctaGrid" aria-hidden="true" />
        <p class="sectionKicker">{{ copy.finalCtaKicker }}</p>
        <h2 id="finalCtaTitle">{{ copy.finalCtaTitleLead }}<br />{{ copy.finalCtaTitleAccent }}</h2>
        <p>{{ copy.finalCtaDescription }}</p>
        <button class="primaryAction" type="button" @click="enterWorkspace">
          {{ copy.enterWorkspace }}
          <icon-arrow-right :size="18" aria-hidden="true" />
        </button>
      </section>
    </main>

    <footer class="siteFooter">
      <button class="brand" type="button" :aria-label="copy.backToTop" @click="scrollToSection('top')">
        <img class="brandLogo" src="/favicon.ico" alt="" @load="usePngFavicon" @error="usePngFavicon" />
        <span>AI classroom</span>
      </button>
      <div class="footerMeta">
        <p>{{ copy.footerDescription }}</p>
        <a class="discordLink" :href="discordUrl" target="_blank" rel="noopener noreferrer" :aria-label="copy.discordAriaLabel">
          <icon-brand-discord :size="17" aria-hidden="true" />
          <span>{{ copy.discord }}</span>
          <icon-arrow-up-right :size="13" aria-hidden="true" />
        </a>
      </div>
    </footer>

    <loginDialog v-model="loginVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { translate } from "@toonflow/i18n/vue";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconBrandDiscord,
  IconBulb,
  IconCamera,
  IconCheck,
  IconFileText,
  IconLayoutGrid,
  IconPhoto,
  IconPlayerPlay,
  IconSparkles,
  IconStack2,
  IconVector,
} from "@tabler/icons-vue";
import { authState } from "@/lib/auth";
import loginDialog from "@/components/loginDialog.vue";
import languageSelect from "@/components/languageSelect.vue";
import landingCanvas from "@/assets/landing/landingCanvas.jpg";
import landingCharacter from "@/assets/landing/landingCharacter.jpg";
import landingDirector from "@/assets/landing/landingDirector.jpg";
import landingVideo from "@/assets/landing/landingVideo.jpg";

const discordUrl = "https://discord.gg/mdXAaHnKyB";
const workflowIcons = [IconBulb, IconLayoutGrid, IconCamera, IconStack2];
const copy = computed(() => ({
  homeLabel: translate("AI classroom 首页"),
  navigationLabel: translate("落地页导航"),
  capabilitiesNav: translate("创作能力"),
  workflowNav: translate("工作流"),
  heroEyebrow: translate("AI 视频创作工作区"),
  heroTitleLead: translate("从一个想法，"),
  heroTitleAccent: translate("到一部完整短片。"),
  heroDescription: translate("在无限画布中编写剧本、拆解分镜、生成角色与场景，再把关键画面变成镜头。AI classroom 把短剧创作中的每一步，连成一条看得见的工作流。"),
  enterWorkspace: translate("进入 Workspace"),
  learnWorkflow: translate("了解创作方式"),
  capabilityTagsLabel: translate("核心能力"),
  capabilityTags: [
    translate("剧本与分镜"),
    translate("角色与场景"),
    translate("图片生成"),
    translate("视频生成"),
  ],
  workspaceProject: translate("画布 · 小蝌蚪找妈妈"),
  autosaved: translate("已自动保存"),
  heroImageAlt: translate("AI classroom 在无限画布中展示剧本、角色、场景和分镜节点"),
  scriptNode: translate("剧本节点"),
  scriptNodeDetail: translate("第 01 场 · 池塘清晨"),
  videoNode: translate("视频镜头"),
  videoNodeDetail: "0:12 · 16:9",
  capabilitiesKicker: translate("一张画布 · 一个故事"),
  capabilitiesTitleLead: translate("不是把工具放在一起，"),
  capabilitiesTitleAccent: translate("而是让内容真正流转起来。"),
  capabilitiesDescription: translate("剧本、角色、图片和视频不是四个孤立的生成框。它们在同一个工作区中相连，上一环节的结果会直接成为下一环节的创作素材。"),
  scriptFeature: {
    number: translate("01 · 剧本"),
    title: translate("把一个灵感，写成能拍出来的镜头。"),
    description: translate("用文本节点生成或手写短剧本，继续拆解场景、人物动作和镜头描述。每段内容都可以连接到后续角色、场景与视频节点。"),
    points: [
      translate("Markdown 编辑与持续保存"),
      translate("剧本、分镜和提示词统一管理"),
      translate("各类素材可作为文本创作参考"),
    ],
    mediaLabel: translate("剧本节点界面示意"),
    nodeName: translate("01_分镜与视频提示词"),
    format: "Markdown",
    scene: translate("场景 01 · 池塘 · 清晨"),
    action: translate("水面上浮着一层薄雾。小蝌蚪第一次离开水草，循着光向池塘深处游去。"),
    shotLabel: translate("镜头："),
    shot: translate("低机位贴近水面，缓慢向前推进。前景芦苇虚化，远处传来鸭妈妈的叫声。"),
    style: translate("# 水彩绘本"),
    camera: translate("# 缓慢推进"),
  },
  imageFeature: {
    number: translate("02 · 图片"),
    title: translate("从角色设定，到可以进入镜头的画面。"),
    description: translate("生成角色、场景、道具和分镜图，并让文本、图片和视频参考共同参与创作。角色立绘和场景资产可以持续复用到后续镜头。"),
    points: [
      translate("角色、场景和道具分镜"),
      translate("多参考图与提示词自由组合"),
      translate("图片可直接流向视频生成"),
    ],
    assetLabel: translate("角色与场景资产"),
    canvasLabel: translate("画布"),
    imageAlt: translate("AI classroom 画布中的角色三视图与图片生成节点"),
    mediaLabel: translate("角色三视图 · 风格参考"),
  },
  videoFeature: {
    number: translate("03 · 视频"),
    title: translate("让关键帧成为动作，让分镜成为片段。"),
    description: translate("使用文本、图片或首尾帧生成视频，也能在 3D 导演台中先完成走位和运镜预演。视频、音频和拉片结果继续回到同一张画布。"),
    points: [
      translate("文生视频、参考图与首尾帧"),
      translate("3D 场景和镜头预演"),
      translate("视频截帧、音频与逐帧拉片"),
    ],
    directorAlt: translate("AI classroom 3D 导演台中的角色走位与镜头预演"),
    videoAlt: translate("AI classroom 视频生成节点与镜头预览"),
    mediaLabel: translate("镜头预演与视频生成"),
  },
  workflowKicker: translate("创作流程"),
  workflowTitleLead: translate("从故事开始，"),
  workflowTitleAccent: translate("在画布上完成整条创作链路。"),
  workflowSteps: [
    { title: translate("写下故事"), description: translate("从一句灵感开始，生成或编辑短剧本。") },
    { title: translate("设计镜头"), description: translate("整理角色、场景与分镜，让视觉保持一致。") },
    { title: translate("生成画面"), description: translate("把关键帧推进为动态镜头，完成镜头预演。") },
    { title: translate("回到素材"), description: translate("视频、音频和拉片结果回到同一工作区继续使用。") },
  ],
  finalCtaKicker: translate("从灵感开始"),
  finalCtaTitleLead: translate("你的下一部短片，"),
  finalCtaTitleAccent: translate("可以从一句话开始。"),
  finalCtaDescription: translate("打开 Workspace，把灵感变成剧本，把文字变成画面，再把画面变成故事。"),
  backToTop: translate("返回页面顶部"),
  footerDescription: translate("AI 短剧与视频创作工作区。"),
  discord: translate("Discord"),
  discordAriaLabel: translate("在新窗口打开 Discord 社区"),
}));
const router = useRouter();
const route = useRoute();
const loginVisible = ref(false);
let revealObserver: IntersectionObserver | undefined;
let revealFallback: ReturnType<typeof setTimeout> | undefined;

function enterWorkspace() {
  if (authState.authenticated) {
    void router.push("/workspace");
    return;
  }
  loginVisible.value = true;
}

function scrollToSection(section: string) {
  document.getElementById(section)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

function usePngFavicon(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  if (!image.src.endsWith("/favicon.png")) image.src = "/favicon.png";
}

watch(() => route.query.login, login => {
  if (login === undefined) return;
  const query = { ...route.query };
  delete query.login;
  void router.replace({ query });
  if (authState.authenticated) {
    void router.push("/workspace");
    return;
  }
  loginVisible.value = true;
}, { immediate: true });

onMounted(() => {
  if (authState.error && !authState.authenticated) loginVisible.value = true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const revealTargets = [...document.querySelectorAll("[data-reveal]")];
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("revealed");
      revealObserver?.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -10%", threshold: 0.12 });
  for (const element of revealTargets) {
    element.classList.add("revealPending");
    revealObserver.observe(element);
  }
  revealFallback = setTimeout(() => {
    for (const element of revealTargets) element.classList.add("revealed");
  }, 1200);
});

onUnmounted(() => {
  revealObserver?.disconnect();
  clearTimeout(revealFallback);
});
</script>

<style lang="scss" scoped>
.landingPage {
  --landingBackground: #07090f;
  --landingSurface: #0d111a;
  --landingText: #f4f7fb;
  --landingMuted: #9ba6b8;
  --landingLine: rgb(255 255 255 / 10%);
  --landingAccent: #61a8ff;
  min-height: 100svh;
  overflow: clip;
  color: var(--landingText);
  color-scheme: dark;
  background:
    radial-gradient(circle at 72% 8%, rgb(50 124 255 / 15%), transparent 28%),
    radial-gradient(circle at 18% 38%, rgb(71 201 192 / 7%), transparent 25%),
    var(--landingBackground);

  button,
  a {
    font: inherit;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--landingAccent);
    outline-offset: 4px;
  }

  .siteHeader {
    position: sticky;
    z-index: 20;
    top: 0;
    border-bottom: 1px solid var(--landingLine);
    background: rgb(7 9 15 / 76%);
    backdrop-filter: blur(18px);

    .headerInner {
      display: flex;
      align-items: center;
      min-width: 0;
      width: min(1200px, calc(100% - 48px));
      height: 72px;
      margin: 0 auto;
    }

    .headerNav {
      display: flex;
      gap: 28px;
      margin-left: auto;
      margin-right: 34px;

      button {
        padding: 0;
        border: 0;
        color: var(--landingMuted);
        background: transparent;
        font-size: 14px;
        cursor: pointer;
        transition: color 160ms ease;

        &:hover { color: var(--landingText); }
      }
    }

    .headerActions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .languageAction {
      :deep(.languageTrigger) {
        min-height: 40px;
        border-color: var(--landingLine);
        color: var(--landingText);
        background: rgb(255 255 255 / 4%);

        &:hover {
          border-color: rgb(255 255 255 / 20%);
          box-shadow: none;
        }
      }
    }
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 0;
    border: 0;
    color: var(--landingText);
    background: transparent;
    font-size: 17px;
    font-weight: 650;
    letter-spacing: -0.02em;
    cursor: pointer;

    .brandLogo {
      width: 32px;
      height: 32px;
    }
  }

  .workspaceButton,
  .primaryAction {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--landingAccent) 72%, white);
    color: #fff;
    background: linear-gradient(135deg, #3d91f6, #2677df);
    box-shadow: 0 10px 34px rgb(38 119 223 / 28%), inset 0 1px rgb(255 255 255 / 24%);
    cursor: pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &:hover {
      transform: translateY(-2px);
      background: linear-gradient(135deg, #55a3ff, #2f82eb);
      box-shadow: 0 14px 40px rgb(38 119 223 / 38%), inset 0 1px rgb(255 255 255 / 28%);
    }
  }

  .workspaceButton {
    gap: 9px;
    min-height: 40px;
    padding: 0 17px;
    border-radius: 11px;
    font-size: 14px;
    font-weight: 650;
  }

  main {
    width: min(1200px, calc(100% - 48px));
    margin: 0 auto;
  }

  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(480px, 0.92fr);
    align-items: center;
    gap: 48px;
    min-height: min(calc(100svh - 72px), 900px);
    padding: 76px 0 94px;
  }

  .heroCopy {
    position: relative;
    z-index: 2;

    .eyebrow,
    .sectionKicker {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 0 0 24px;
      color: #8dbcf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
    }

    .statusDot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #66c6ad;
      box-shadow: 0 0 0 5px rgb(102 198 173 / 9%);
    }

    h1 {
      margin: 0;
      font-size: clamp(50px, 5.2vw, 70px);
      font-weight: 690;
      letter-spacing: -0.065em;
      line-height: 0.99;

      span {
        color: #a8c9f2;
        background: linear-gradient(92deg, #f6f8ff 8%, #7eb8ff 70%, #67d6cb);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        white-space: nowrap;
      }
    }

    .heroDescription {
      max-width: 560px;
      margin: 28px 0 0;
      color: var(--landingMuted);
      font-size: 17px;
      line-height: 1.85;
    }

    .heroActions {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-top: 34px;
    }

    .primaryAction {
      gap: 12px;
      min-height: 50px;
      padding: 0 22px;
      border-radius: 13px;
      font-size: 15px;
      font-weight: 680;
    }

    .secondaryAction {
      padding: 0;
      border: 0;
      color: #c2cbd8;
      background: transparent;
      font-size: 14px;
      cursor: pointer;
      text-underline-offset: 5px;
    }

    .capabilityTags {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin: 38px 0 0;
      padding: 0;
      list-style: none;

      li {
        padding: 7px 11px;
        border: 1px solid var(--landingLine);
        border-radius: 999px;
        color: #8f9bac;
        background: rgb(255 255 255 / 2.5%);
        font-size: 12px;
      }
    }
  }

  .heroVisual {
    position: relative;
    min-width: 0;
  }

  .workspaceStage {
    position: relative;
    padding: 20px 0 22px 20px;

    &::before {
      position: absolute;
      inset: 8% 2% 4% 12%;
      border-radius: 50%;
      background: rgb(57 132 255 / 19%);
      filter: blur(70px);
      content: "";
    }
  }

  .workspaceWindow {
    position: relative;
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 14%);
    border-radius: 18px;
    background: #0c1018;
    box-shadow: 0 40px 100px rgb(0 0 0 / 50%), 0 0 0 1px rgb(255 255 255 / 3%);
    transform: perspective(1400px) rotateY(-3deg) rotateX(1.5deg);
    transform-origin: left center;

    .windowBar {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 36px;
      padding: 0 12px;
      border-bottom: 1px solid var(--landingLine);
      color: #778499;
      background: #0a0d14;
      font-size: 10px;
    }

    .windowDots {
      display: flex;
      gap: 5px;

      i {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #394252;
      }
    }

    .windowProject {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .windowStatus {
      margin-left: auto;
      color: #657184;
    }

    .heroImage {
      display: block;
      width: 100%;
      aspect-ratio: 1912 / 966;
      object-fit: cover;
    }
  }

  .floatingNode {
    position: absolute;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 13px;
    border: 1px solid rgb(255 255 255 / 13%);
    border-radius: 12px;
    color: #e4ebf5;
    background: rgb(12 16 24 / 90%);
    box-shadow: 0 16px 42px rgb(0 0 0 / 40%);
    backdrop-filter: blur(12px);
    font-size: 11px;
    line-height: 1.25;

    small {
      display: block;
      margin-bottom: 3px;
      color: #7c899c;
      font-size: 9px;
    }

    .nodeIcon {
      display: grid;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      color: #72adf8;
      background: rgb(76 145 240 / 13%);
      place-items: center;
    }

    &.scriptNode {
      bottom: 7%;
      left: -26px;
    }

    &.videoNode {
      top: 15%;
      right: -18px;
    }
  }

  .capabilities {
    scroll-margin-top: 88px;
    padding: 76px 0 126px;
  }

  .sectionHeading {
    max-width: 780px;
    margin: 0 auto 94px;
    text-align: center;

    .sectionKicker {
      justify-content: center;
      margin: 0 0 22px;
      color: #78aef4;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.15em;
    }

    h2,
    h3 {
      margin: 0;
      font-size: clamp(36px, 4vw, 54px);
      font-weight: 660;
      letter-spacing: -0.045em;
      line-height: 1.12;
    }

    > p:last-child {
      max-width: 650px;
      margin: 24px auto 0;
      color: var(--landingMuted);
      font-size: 16px;
      line-height: 1.8;
    }
  }

  .featureRow {
    display: grid;
    grid-template-columns: minmax(300px, 0.75fr) minmax(0, 1.25fr);
    align-items: center;
    gap: 72px;
    margin-top: 122px;

    &.reverse {
      grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);

      .featureCopy { order: 2; }
      .featureMedia { order: 1; }
    }

    .featureCopy {
      .featureNumber {
        color: #78aef4;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
      }

      h3 {
        margin: 18px 0 20px;
        font-size: clamp(30px, 3.3vw, 46px);
        font-weight: 650;
        letter-spacing: -0.045em;
        line-height: 1.16;
      }

      > p {
        margin: 0;
        color: var(--landingMuted);
        font-size: 15px;
        line-height: 1.85;
      }

      ul {
        display: grid;
        gap: 11px;
        margin: 26px 0 0;
        padding: 0;
        list-style: none;

        li {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #bdc7d5;
          font-size: 13px;
        }

        svg { color: #69bea8; }
      }
    }
  }

  .featureMedia {
    position: relative;
    min-width: 0;
    padding: 17px;
    border: 1px solid var(--landingLine);
    border-radius: 22px;
    background: linear-gradient(145deg, rgb(255 255 255 / 4%), rgb(255 255 255 / 1%));
    box-shadow: 0 30px 80px rgb(0 0 0 / 26%);
  }

  .nodeWindow,
  .screenshotFrame,
  .directorFrame,
  .videoFrame {
    overflow: hidden;
    border: 1px solid rgb(255 255 255 / 11%);
    border-radius: 13px;
    background: #0b0f16;
  }

  .nodeWindowBar,
  .screenshotBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 34px;
    padding: 0 12px;
    border-bottom: 1px solid var(--landingLine);
    color: #7e8a9c;
    background: #090c12;
    font-size: 10px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }

  .scriptMedia {
    padding: 24px;
    background:
      linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px),
      #080b12;
    background-size: 28px 28px;

    .scriptBody {
      min-height: 340px;
      padding: 34px 36px;
      background: linear-gradient(135deg, rgb(57 130 240 / 8%), transparent 54%), #0d1119;

      p {
        max-width: 620px;
        margin: 0 0 18px;
        color: #b8c1cf;
        font-size: 14px;
        line-height: 1.8;
      }

      .scriptScene {
        color: #76aef6;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }

      strong { color: #e6edf6; }
    }

    .scriptChips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 30px;

      span {
        padding: 6px 9px;
        border: 1px solid rgb(121 174 244 / 18%);
        border-radius: 999px;
        color: #7da9dd;
        background: rgb(84 146 224 / 7%);
        font-size: 10px;
      }
    }

    .mediaGlow {
      position: absolute;
      right: 4%;
      bottom: 0;
      width: 68%;
      height: 42%;
      border-radius: 50%;
      background: rgb(66 141 248 / 15%);
      filter: blur(64px);
      pointer-events: none;
    }
  }

  .screenshotFrame {
    img {
      display: block;
      width: 100%;
      aspect-ratio: 1920 / 1027;
      object-fit: cover;
    }
  }

  .mediaLabel {
    position: absolute;
    right: 30px;
    bottom: 28px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 12px;
    border: 1px solid rgb(255 255 255 / 13%);
    border-radius: 10px;
    color: #dbe5f2;
    background: rgb(8 11 17 / 88%);
    box-shadow: 0 10px 30px rgb(0 0 0 / 34%);
    backdrop-filter: blur(12px);
    font-size: 10px;
  }

  .videoMedia {
    min-height: 490px;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;

    .directorFrame {
      width: 92%;
      box-shadow: 0 26px 70px rgb(0 0 0 / 36%);

      img {
        display: block;
        width: 100%;
      }
    }

    .videoFrame {
      position: absolute;
      z-index: 2;
      right: 0;
      bottom: 0;
      width: 48%;
      border-color: rgb(255 255 255 / 18%);
      box-shadow: 0 24px 60px rgb(0 0 0 / 48%);

      img {
        display: block;
        width: 100%;
      }
    }

    .mediaLabel {
      right: 4px;
      bottom: 184px;
    }
  }

  .workflowSection {
    scroll-margin-top: 88px;
    display: grid;
    grid-template-columns: 0.7fr 1.3fr;
    gap: 82px;
    padding: 118px 0 138px;
    border-top: 1px solid var(--landingLine);

    .workflowIntro {
      .sectionKicker {
        margin: 0 0 22px;
        color: #78aef4;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.15em;
      }

      h2 {
        margin: 0;
        font-size: clamp(36px, 3.7vw, 52px);
        font-weight: 660;
        letter-spacing: -0.045em;
        line-height: 1.14;
      }
    }

    .workflowSteps {
      position: relative;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        position: relative;
        min-height: 190px;
        padding: 24px;
        overflow: hidden;
        border: 1px solid var(--landingLine);
        border-radius: 18px;
        background: linear-gradient(145deg, rgb(255 255 255 / 4%), rgb(255 255 255 / 1%));

        .stepNumber {
          position: absolute;
          top: 18px;
          right: 20px;
          color: #394555;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
        }

        .stepIcon {
          display: grid;
          width: 40px;
          height: 40px;
          margin-bottom: 25px;
          border: 1px solid rgb(109 173 250 / 18%);
          border-radius: 12px;
          color: #7eb5ff;
          background: rgb(75 139 232 / 8%);
          place-items: center;
        }

        h3 {
          margin: 0 0 9px;
          font-size: 17px;
        }

        p {
          margin: 0;
          color: #8793a4;
          font-size: 12px;
          line-height: 1.7;
        }
      }
    }
  }

  .finalCta {
    position: relative;
    padding: 90px 40px;
    overflow: hidden;
    border: 1px solid rgb(121 174 244 / 16%);
    border-radius: 28px;
    text-align: center;
    background:
      radial-gradient(circle at 50% 120%, rgb(54 129 241 / 30%), transparent 45%),
      linear-gradient(145deg, #0d1421, #090c13);

    .ctaGrid {
      position: absolute;
      inset: 0;
      opacity: 0.34;
      background:
        linear-gradient(rgb(255 255 255 / 3%) 1px, transparent 1px),
        linear-gradient(90deg, rgb(255 255 255 / 3%) 1px, transparent 1px);
      background-size: 38px 38px;
      mask-image: linear-gradient(to bottom, transparent, #000 44%, transparent);
    }

    > *:not(.ctaGrid) {
      position: relative;
      z-index: 1;
    }

    .sectionKicker {
      margin: 0 0 20px;
      color: #78aef4;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.15em;
    }

    h2 {
      margin: 0;
      font-size: clamp(40px, 5vw, 64px);
      font-weight: 670;
      letter-spacing: -0.055em;
      line-height: 1.08;
    }

    > p {
      max-width: 560px;
      margin: 24px auto 30px;
      color: var(--landingMuted);
      line-height: 1.8;
    }

    .primaryAction {
      gap: 12px;
      min-height: 50px;
      padding: 0 22px;
      border-radius: 13px;
      font-size: 15px;
      font-weight: 680;
    }
  }

  .siteFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: min(1200px, calc(100% - 48px));
    margin: 54px auto 0;
    padding: 34px 0 42px;
    border-top: 1px solid var(--landingLine);

    p {
      margin: 0;
      color: #606c7d;
      font-size: 11px;
      letter-spacing: 0.04em;
    }
  }

  .footerMeta {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .discordLink {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--landingMuted);
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: color 180ms ease;

    &:hover {
      color: var(--landingText);
    }

    &:focus-visible {
      border-radius: 4px;
      outline: 2px solid var(--landingAccent);
      outline-offset: 4px;
    }
  }

  [data-reveal].revealPending {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 700ms ease, transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1);

    &.revealed {
      opacity: 1;
      transform: none;
    }
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
      padding-top: 70px;
    }

    .heroCopy {
      max-width: 720px;

      h1 { font-size: clamp(52px, 10vw, 76px); }
    }

    .heroVisual {
      margin-top: 12px;
    }

    .featureRow,
    .featureRow.reverse {
      grid-template-columns: 1fr;
      gap: 38px;

      .featureCopy,
      .featureMedia {
        order: initial;
      }

      .featureCopy { max-width: 690px; }
    }

    .workflowSection {
      grid-template-columns: 1fr;
      gap: 46px;
    }
  }

  @media (max-width: 720px) {
    .siteHeader {
      .headerInner {
        width: min(100% - 32px, 1200px);
        gap: 12px;
      }

      .headerNav { display: none; }
      .headerActions {
        margin-left: auto;
        gap: 8px;
      }

      .languageAction {
        :deep(.triggerName),
        :deep(.triggerChevron) {
          display: none;
        }

        :deep(.languageTrigger) {
          justify-content: center;
          width: 36px;
          min-height: 36px;
          padding: 0;
        }
      }

      .workspaceButton {
        min-height: 36px;
        margin-left: 0;
        padding: 0 12px;
        gap: 5px;
        font-size: 13px;
      }

      .brand {
        gap: 7px;
        font-size: 15px;

        .brandLogo {
          width: 28px;
          height: 28px;
        }
      }
    }

    main,
    .siteFooter {
      width: min(100% - 32px, 1200px);
    }

    .hero {
      gap: 34px;
      padding: 54px 0 76px;
    }

    .heroCopy {
      h1 {
        font-size: clamp(36px, 10vw, 46px);
        letter-spacing: -0.075em;
        line-height: 1.05;

        span {
          white-space: normal;
        }
      }

      .heroDescription {
        margin-top: 22px;
        font-size: 15px;
      }

      .heroActions {
        align-items: flex-start;
        flex-direction: column;
        gap: 17px;
      }

      .capabilityTags { margin-top: 28px; }
    }

    .workspaceStage {
      padding: 4px 0;
    }

    .workspaceWindow {
      border-radius: 13px;
      transform: none;

      .windowBar { height: 31px; }
      .windowStatus { display: none; }
    }

    .floatingNode {
      display: none;
    }

    .capabilities {
      padding: 42px 0 84px;
    }

    .sectionHeading {
      margin-bottom: 70px;

      h2 { font-size: 36px; }
    }

    .featureRow {
      margin-top: 84px;

      .featureCopy h3 { font-size: 31px; }
    }

    .featureMedia {
      padding: 10px;
      border-radius: 16px;
    }

    .scriptMedia {
      padding: 10px;

      .scriptBody {
        min-height: 300px;
        padding: 24px 20px;
      }
    }

    .videoMedia {
      min-height: 360px;
      padding: 0;

      .videoFrame { width: 58%; }
      .mediaLabel { display: none; }
    }

    .workflowSection {
      padding: 82px 0 92px;
    }

    .workflowSteps {
      grid-template-columns: 1fr !important;
    }

    .finalCta {
      padding: 68px 22px;
      border-radius: 21px;

      h2 { font-size: 40px; }
    }

    .siteFooter {
      width: min(100% - 32px, 1200px);
      align-items: flex-start;
      flex-direction: column;
      gap: 18px;
    }

    .footerMeta {
      justify-content: space-between;
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-reveal].revealPending {
      opacity: 1;
      transform: none;
      transition: none;
    }

    .workspaceWindow { transform: none; }
  }
}
</style>
