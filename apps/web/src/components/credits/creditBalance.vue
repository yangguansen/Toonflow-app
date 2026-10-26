<template>
  <el-popover v-model:visible="visible" trigger="click" placement="bottom-end" :width="380" :showArrow="false" @show="refresh">
    <template #reference>
      <el-button class="creditTrigger" text :loading="creditLoading" :aria-label="translate('查看积分余额与用量')">
        <icon-coins :size="15" aria-hidden="true" />
        <span class="creditText">{{ balanceLabel }}</span>
      </el-button>
    </template>
    <div class="creditPanel" :aria-busy="creditLoading">
      <div class="panelHeader">
        <div>
          <span class="panelLabel">{{ translate("账户积分") }}</span>
          <strong class="balanceNumber">{{ balanceLabel }}</strong>
        </div>
        <el-button text circle :icon="IconRefresh" :loading="creditLoading" :aria-label="translate('刷新积分')" :title="translate('刷新积分')" @click="refresh" />
      </div>
      <el-button v-if="creditSummary?.purchaseEnabled" class="rechargeButton" type="primary" plain :icon="IconCreditCard" @click="rechargeVisible = true">
        {{ translate("购买积分") }}
      </el-button>
      <el-alert v-if="creditError" :title="creditError" type="error" :closable="false" showIcon />
      <div v-else class="usageList" role="list" :aria-label="translate('最近 AI 用量')">
        <div v-for="item in creditUsage" :key="item.id" class="usageItem" role="listitem">
          <div class="usageMain">
            <span class="usageType">{{ mediaTypeLabel(item.mediaType) }}</span>
            <el-tag :type="statusType(item.status)" size="small" effect="plain">{{ statusLabel(item.status) }}</el-tag>
            <span class="usageCharge">{{ chargeLabel(item) }}</span>
          </div>
          <div class="usageMeta">
            <span>{{ item.modelId }}</span>
            <time :datetime="item.createdAt">{{ formatTime(item.createdAt) }}</time>
          </div>
        </div>
        <div v-if="!creditUsage.length" class="emptyUsage">{{ translate("暂无 AI 用量记录") }}</div>
      </div>
      <creditRechargeDialog v-model="rechargeVisible" :packages="creditSummary?.packages ?? []" />
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import dayjs from "dayjs";
import { locale, translate } from "@toonflow/i18n/vue";
import { computed, ref } from "vue";
import { IconCoins, IconCreditCard, IconRefresh } from "@tabler/icons-vue";
import { creditError, creditLoading, creditSummary, creditUsage, refreshCredits, type CreditUsage } from "@/lib/credits";
import creditRechargeDialog from "./creditRechargeDialog.vue";

const visible = ref(false);
const rechargeVisible = ref(false);
const numberFormat = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }));
const balanceLabel = computed(() => creditSummary.value
  ? translate("{0} 积分", { 0: numberFormat.value.format(creditSummary.value.balanceCredits) })
  : "—");

function refresh() {
  void refreshCredits();
}

function mediaTypeLabel(type: CreditUsage["mediaType"]) {
  if (type === "image") return translate("图片");
  if (type === "video") return translate("视频");
  return translate("音频");
}

function statusLabel(status: CreditUsage["status"]) {
  if (status === "running") return translate("待结算");
  if (status === "succeeded") return translate("已结算");
  return translate("已退回");
}

function statusType(status: CreditUsage["status"]): "warning" | "success" | "info" {
  if (status === "running") return "warning";
  if (status === "succeeded") return "success";
  return "info";
}

function chargeLabel(item: CreditUsage) {
  if (item.status === "running") return translate("预扣 {0} 积分", { 0: numberFormat.value.format(item.reservedCredits) });
  return translate("{0} 积分", { 0: numberFormat.value.format(item.chargedCredits) });
}

function formatTime(value: string) {
  return dayjs(value).format("MM-DD HH:mm");
}
</script>

<style lang="scss" scoped>
.creditTrigger {
  height: 28px;
  padding: 0 4px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  :deep(> span) { display: flex; align-items: center; gap: 4px; }
}

.creditPanel {
  .panelHeader {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .panelLabel {
    display: block;
    margin-bottom: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }

  .balanceNumber {
    font-size: 24px;
    font-variant-numeric: tabular-nums;
  }

  .rechargeButton {
    width: 100%;
    margin-bottom: 12px;
  }

  .usageList {
    max-height: 360px;
    overflow-y: auto;
  }

  .usageItem {
    padding: 9px 0;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .usageMain,
  .usageMeta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .usageType { font-weight: 500; }
  .usageCharge { margin-left: auto; font-variant-numeric: tabular-nums; }

  .usageMeta {
    justify-content: space-between;
    margin-top: 4px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    time { flex-shrink: 0; }
    span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }

  .emptyUsage {
    padding: 24px 0 10px;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    text-align: center;
  }
}
</style>
