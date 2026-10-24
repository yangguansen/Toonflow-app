<template>
  <main class="loginPage">
    <section class="loginPanel" aria-labelledby="loginTitle">
      <div class="brand">
        <el-image class="brandLogo" :src="logoUrl" fit="contain" alt="Toonflow" />
        <span>Toonflow</span>
      </div>
      <div class="loginContent">
        <h1 id="loginTitle">{{ translate("登录 Toonflow") }}</h1>
        <p>{{ translate("使用你的 Supabase 账号进入工作区。") }}</p>
        <el-alert v-if="authState.error" :title="authState.error" type="error" :closable="false" showIcon />
        <div v-if="providers.length" class="providerActions">
          <el-button
            v-for="provider in providers"
            :key="provider"
            class="providerButton"
            type="primary"
            :loading="pendingProvider === provider"
            :disabled="!!pendingProvider"
            @click="login(provider)">
            <icon-brand-github v-if="provider === 'github'" :size="19" aria-hidden="true" />
            <icon-brand-google v-else-if="provider === 'google'" :size="19" aria-hidden="true" />
            <span>{{ translate("使用 {0} 登录", { 0: providerLabel(provider) }) }}</span>
          </el-button>
        </div>
        <p v-else-if="!authState.error" class="providerHint">{{ translate("当前环境尚未启用 OAuth 登录方式。") }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage } from "element-plus";
import { translate } from "@toonflow/i18n/vue";
import { IconBrandGithub, IconBrandGoogle, IconLogin } from "@tabler/icons-vue";
import logoUrl from "@toonflow/assets/logo.svg";
import { authState, getAuthProviders, signInWithOAuth } from "@/lib/auth";

const pendingProvider = ref("");
const providers = computed(() => getAuthProviders());

function providerLabel(provider: string) {
  return ({ github: "GitHub", google: "Google" } as Record<string, string>)[provider] ?? provider;
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
</script>

<style lang="scss" scoped>
.loginPage {
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 24px;
  color: var(--el-text-color-primary);
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--el-color-primary) 16%, transparent), transparent 48%),
    var(--el-bg-color);

  .loginPanel {
    width: min(440px, 100%);
    padding: 36px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: calc(var(--ui-radius) * 2);
    background: color-mix(in srgb, var(--el-bg-color-overlay) 92%, transparent);
    box-shadow: var(--el-box-shadow-light);

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

    .loginContent {
      display: grid;
      gap: 16px;
      margin-top: 44px;

      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.25;
      }

      > p {
        margin: 0 0 8px;
        color: var(--el-text-color-secondary);
        line-height: 1.7;
      }

      .providerActions {
        display: grid;
        gap: 10px;

        .providerButton {
          width: 100%;
          min-height: 46px;
          margin: 0;
          border-radius: calc(var(--ui-radius) * 1.5);

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
  }
}
</style>
