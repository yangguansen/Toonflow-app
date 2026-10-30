<template>
  <el-dialog
    v-model="visible"
    class="loginDialog"
    width="min(440px, calc(100vw - 32px))"
    alignCenter
    appendToBody
    destroyOnClose
    :title="authMode === 'login' ? translate('登录 AI classroom') : translate('创建账号')"
    @closed="resetFeedback">
    <div class="loginDialogContent">
      <div class="brand">
        <img class="brandLogo" src="/favicon.ico" alt="AI classroom" @load="usePngFavicon" @error="usePngFavicon" />
        <span>AI classroom</span>
      </div>
      <div class="authModeTabs" role="tablist" :aria-label="translate('账号操作')">
        <button
          type="button"
          class="authModeTab"
          :class="{ active: authMode === 'login' }"
          role="tab"
          :aria-selected="authMode === 'login'"
          :disabled="authPending || !!pendingProvider"
          @click="switchAuthMode('login')">
          {{ translate("登录") }}
        </button>
        <button
          type="button"
          class="authModeTab"
          :class="{ active: authMode === 'signup' }"
          role="tab"
          :aria-selected="authMode === 'signup'"
          :disabled="authPending || !!pendingProvider"
          @click="switchAuthMode('signup')">
          {{ translate("注册") }}
        </button>
      </div>
      <p class="loginDescription">
        {{ authMode === "login" ? translate("使用邮箱和密码登录。") : translate("使用邮箱创建账号，注册后会直接登录。") }}
      </p>
      <el-alert v-if="authState.error" :title="authState.error" type="error" :closable="false" showIcon />
      <el-form v-if="authState.configured" class="emailLogin" labelPosition="top" @submit.prevent="submitPassword">
        <el-form-item :label="translate('邮箱')">
          <el-input
            ref="emailInput"
            v-model="email"
            type="email"
            autocomplete="username"
            inputmode="email"
            autocapitalize="none"
            :spellcheck="false"
            :disabled="authPending || !!pendingProvider"
            :aria-label="translate('邮箱')" />
        </el-form-item>
        <el-form-item :label="translate('密码')">
          <el-input
            ref="passwordInput"
            v-model="password"
            type="password"
            :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
            :minlength="6"
            :maxlength="72"
            showPassword
            :disabled="authPending || !!pendingProvider"
            :aria-label="translate('密码')" />
        </el-form-item>
        <el-alert v-if="emailError" :title="emailError" type="error" :closable="false" showIcon />
        <el-button class="emailLoginButton" type="primary" nativeType="submit" :loading="authPending" :disabled="!!pendingProvider">
          <icon-login :size="18" aria-hidden="true" />
          <span>{{ authMode === "login" ? translate("登录") : translate("创建并登录") }}</span>
        </el-button>
      </el-form>
      <div v-if="providers.length" class="providerActions">
        <el-button
          v-for="provider in providers"
          :key="provider"
          class="providerButton"
          type="primary"
          :loading="pendingProvider === provider"
          :disabled="!!pendingProvider || authPending"
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
import { useRouter } from "vue-router";
import { ElMessage, type InputInstance } from "element-plus";
import { translate } from "@toonflow/i18n/vue";
import { IconBrandGithub, IconBrandGoogle, IconLogin } from "@tabler/icons-vue";
import { authState, getAuthProviders, signInWithOAuth, signInWithPassword, signUpWithPassword } from "@/lib/auth";

const visible = defineModel<boolean>({ required: true });
const router = useRouter();
const pendingProvider = ref("");
const authPending = ref(false);
const authMode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
const emailError = ref("");
const emailInput = ref<InputInstance>();
const passwordInput = ref<InputInstance>();
const providers = computed(() => getAuthProviders());

watch([email, password], () => {
  emailError.value = "";
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
  authPending.value = false;
  authMode.value = "login";
  password.value = "";
  emailError.value = "";
}

function switchAuthMode(mode: "login" | "signup") {
  if (authPending.value || pendingProvider.value) return;
  authMode.value = mode;
  emailError.value = "";
  emailInput.value?.focus();
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

async function submitPassword() {
  if (authPending.value) return;
  emailError.value = "";
  if (!email.value.trim()) {
    emailError.value = translate("请输入邮箱");
    emailInput.value?.focus();
    return;
  }
  if (password.value.length < 6) {
    emailError.value = translate("密码至少需要 6 位");
    passwordInput.value?.focus();
    return;
  }
  authPending.value = true;
  try {
    const normalizedEmail = email.value.trim();
    if (authMode.value === "login") {
      await signInWithPassword(normalizedEmail, password.value);
    } else {
      await signUpWithPassword(normalizedEmail, password.value);
    }
    authState.error = "";
    visible.value = false;
    void router.push("/workspace");
  } catch (error) {
    emailError.value = error instanceof Error ? error.message : translate("登录失败，请重试");
  } finally {
    authPending.value = false;
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

  .authModeTabs {
    display: flex;
    gap: 24px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .authModeTab {
      position: relative;
      padding: 0 0 10px;
      border: 0;
      background: transparent;
      color: var(--el-text-color-secondary);
      font: inherit;
      font-weight: 600;
      cursor: pointer;

      &.active {
        color: var(--el-color-primary);

        &::after {
          position: absolute;
          right: 0;
          bottom: -1px;
          left: 0;
          height: 2px;
          border-radius: 2px;
          background: currentColor;
          content: "";
        }
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
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
