<template>
  <el-dialog v-model="visible" :title="translate('购买积分')" width="min(520px, calc(100vw - 32px))" alignCenter appendToBody destroyOnClose :closeOnClickModal="false">
    <div class="rechargeContent">
      <div class="rateInfo">
        <strong>{{ rateLabel }}</strong>
        <el-text size="small" type="info">{{ translate("选择套餐后将前往 Stripe 安全支付页面。") }}</el-text>
      </div>
      <div class="packageList" role="list" :aria-label="translate('积分套餐')">
        <el-button
          v-for="item in packages"
          :key="item.id"
          class="packageButton"
          :loading="payingPackageId === item.id"
          :disabled="!!payingPackageId"
          role="listitem"
          :aria-label="packageAriaLabel(item)"
          @click="startCheckout(item)">
          <span class="packageCredits">{{ packageCreditsLabel(item) }}</span>
          <span class="packagePrice">{{ formatPrice(item.amountCents) }}</span>
        </el-button>
      </div>
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" showIcon />
    </div>
    <template #footer>
      <el-button :disabled="!!payingPackageId" @click="visible = false">{{ translate("取消") }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { locale, translate } from "@toonflow/i18n/vue";
import { computed, ref, watch } from "vue";
import axios from "axios";
import { createCreditCheckout, type CreditPackage } from "@/lib/credits";

const { packages } = defineProps<{
  packages: CreditPackage[];
}>();
const visible = defineModel<boolean>({ default: false });
const payingPackageId = ref("");
const errorMessage = ref("");
const creditsFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }));
const priceFormat = computed(() => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}));
const rateLabel = computed(() => translate("$1 = {0} 积分", { 0: formatCredits(1000) }));

function formatCredits(credits: number) {
  return creditsFormat.value.format(credits);
}

function formatPrice(amountCents: number) {
  return priceFormat.value.format(amountCents / 100);
}

function packageCreditsLabel(item: CreditPackage) {
  return translate("{0} 积分", { 0: formatCredits(item.credits) });
}

function packageAriaLabel(item: CreditPackage) {
  return translate("购买 {0} 积分，价格 {1}", {
    0: formatCredits(item.credits),
    1: formatPrice(item.amountCents),
  });
}

async function startCheckout(item: CreditPackage) {
  if (payingPackageId.value || !visible.value) return;
  payingPackageId.value = item.id;
  errorMessage.value = "";
  try {
    const url = await createCreditCheckout(item.id);
    if (!URL.canParse(url) || !["http:", "https:"].includes(new URL(url).protocol)) throw new Error(translate("支付地址无效"));
    window.location.assign(url);
  } catch (error) {
    errorMessage.value = axios.isAxiosError<{ message?: string }>(error)
      ? error.response?.data?.message || error.message
      : error instanceof Error ? error.message : translate("创建支付页面失败，请重试");
    payingPackageId.value = "";
  }
}

watch(visible, opened => {
  if (opened) return;
  payingPackageId.value = "";
  errorMessage.value = "";
});
</script>

<style lang="scss" scoped>
.rechargeContent {
  display: grid;
  gap: 18px;
}

.rateInfo {
  display: grid;
  gap: 6px;

  strong {
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }
}

.packageList {
  display: grid;
  gap: 10px;
}

.packageButton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 58px;
  margin: 0;
  padding: 0 18px;

  :deep(> span) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}

.packageCredits {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.packagePrice {
  color: var(--el-color-primary);
  font-size: 18px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
