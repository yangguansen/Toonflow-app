<template>
  <el-dialog
    v-model="visible"
    class="loginDialog"
    width="min(440px, calc(100vw - 32px))"
    alignCenter
    appendToBody
    destroyOnClose
    :title="translate('登录 AI classroom')"
    @closed="resetFeedback">
    <div class="loginDialogContent">
      <div class="brand">
        <img class="brandLogo" src="/favicon.ico" alt="AI classroom" @load="usePngFavicon" @error="usePngFavicon" />
        <span>AI classroom</span>
      </div>
      <p class="loginDescription">{{ translate("输入邮箱，我们会发送一次性登录链接。首次登录会自动创建账号。") }}</p>
      <el-alert v-if="authState.error" :title="authState.error" type="error" :closable="false" showIcon />
      <el-form v-if="authState.configured" class="emailLogin" labelPosition="top" @submit.prevent="sendLoginLink">
        <el-form-item :label="translate('邮箱')">
          <el-input
            ref="emailInput"
            v-model="email"
            type="email"
            autocomplete="username"
            inputmode="email"
            autocapitalize="none"
            :spellcheck="false"
            :disabled="emailPending || !!pendingProvider"
            aria-label="邮箱" />
        </el-form-item>
        <el-alert v-if="emailError" :title="emailError" type="error" :closable="false" showIcon />
        <el-alert v-if="emailSent" :title="translate('登录链接已发送，请检查 {0} 的收件箱并打开链接。', { 0: email.trim() })" type="success" :closable="false" showIcon />
        <el-button class="emailLoginButton" type="primary" nativeType="submit" :loading="emailPending" :disabled="!!pendingProvider">
          <icon-login :size="18" aria-hidden="true" />
          <span>{{ translate("发送登录链接") }}</span>
        </el-button>
      </el-form>
      <div v-if="providers.length" class="providerActions">
        <el-button
          v-for="provider in providers"
          :key="provider"
          class="providerButton"
          type="primary"
          :loading="pendingProvider === provider"
          :disabled="!!pendingProvider || emailPending"
          @click="login(provider)">
          <icon-brand-github v-if="provider === 'github'" :size="19" aria-hidden="true" />
          <icon-brand-google v-else-if="provider === 'google'" :size="19" aria-hidden="true" />
          <span>{{ translate("使用 {0} 登录", { 0: providerLabel(provider) }) }}</span>
        </el-button>
      </div>
      <p v-else-if="!authState.error" class="providerHint">{{ translate("当前环境尚未启用 OAuth 登录方式。") }}</p>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage, type InputInstance } from "element-plus";
import { translate } from "@toonflow/i18n/vue";
import { IconBrandGithub, IconBrandGoogle, IconLogin } from "@tabler/icons-vue";
import { authState, getAuthProviders, sendMagicLink, signInWithOAuth } from "@/lib/auth";

const visible = defineModel<boolean>({ required: true });
const pendingProvider = ref("");
const emailPending = ref(false);
const email = ref("");
const emailError = ref("");
const emailSent = ref(false);
const emailInput = ref<InputInstance>();
const providers = computed(() => getAuthProviders());

watch(email, () => {
  emailError.value = "";
  emailSent.value = false;
});

watch(() => authState.authenticated, authenticated => {
  if (authenticated) visible.value = false;
});

function providerLabel(provider: string) {
  return ({ github: "GitHub", google: "Google" } as Record<string, string>)[provider] ?? provider;
}

function usePngFavicon(event: Event) {
  const image = event.currentTarget as HTMLImageElement;
  if (!image.src.endsWith("/favicon.png")) image.src = "/favicon.png";
}

function resetFeedback() {
  pendingProvider.value = "";
  emailPending.value = false;
  emailError.value = "";
  emailSent.value = false;
}

async function login(provider: string) {
  if (pendingProvider.value) return;
  pendingProvider.value = provider;
  try {
    await signInWithOAuth(provider);
  } catch (error) {
    pendingProvider.value = "";
    ElMessage.error(error instanceof Error ? error.message : translate("无法发起登录"));
  }
}

async function sendLoginLink() {
  if (emailPending.value) return;
  emailError.value = "";
  emailSent.value = false;
  if (!email.value.trim()) {
    emailError.value = translate("请输入邮箱");
    emailInput.value?.focus();
    return;
  }
  emailPending.value = true;
  try {
    await sendMagicLink(email.value.trim());
    authState.error = "";
    emailSent.value = true;
  } catch (error) {
    emailError.value = error instanceof Error ? error.message : translate("无法发送登录链接，请稍后重试");
  } finally {
    emailPending.value = false;
  }
}
</script>

<style lang="scss" scoped>
.loginDialogContent {
  display: grid;
  gap: 16px;
  color: var(--el-text-color-primary);

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    font-weight: 650;

    .brandLogo {
      width: 34px;
      height: 34px;
    }
  }

  .loginDescription {
    margin: 0;
    color: var(--el-text-color-secondary);
    line-height: 1.7;
  }

  .emailLogin {
    display: grid;
    gap: 2px;

    :deep(.el-form-item) {
      margin-bottom: 16px;
    }

    .emailLoginButton {
      width: 100%;
      min-height: 46px;
      margin-top: 2px;
      border-radius: var(--ui-radius-large);

      :deep(> span) {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }
  }

  .providerActions {
    display: grid;
    gap: 10px;

    .providerButton {
      width: 100%;
      min-height: 46px;
      margin: 0;
      border-radius: var(--ui-radius-large);

      :deep(> span) {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }
  }

  .providerHint {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}
</style>

<style lang="scss">
.loginDialog.el-dialog {
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 28px 90px color-mix(in srgb, #000 34%, transparent);

  .el-dialog__body {
    padding-top: 10px;
  }
}
</style>
