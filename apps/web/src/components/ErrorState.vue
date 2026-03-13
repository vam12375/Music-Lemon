<template>
  <div class="error-state">
    <p class="error-state__icon">{{ icon }}</p>
    <p class="error-state__title">{{ title }}</p>
    <p v-if="detail" class="error-state__detail">{{ detail }}</p>
    <div class="error-state__actions">
      <button v-if="retryable" class="error-state__btn" @click="$emit('retry')">重试</button>
      <router-link to="/" class="error-state__btn error-state__btn--ghost">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  message: string;
  code?: number;
}>();

defineEmits<{ retry: [] }>();

// 根据状态码映射展示内容
const icon = computed(() => {
  switch (props.code) {
    case 401: case 403: return "🔒";
    case 402: return "💳";
    case 404: return "🔍";
    case 429: return "⏳";
    default: return "⚠️";
  }
});

const title = computed(() => {
  switch (props.code) {
    case 401: return "未授权";
    case 402: return "积分不足";
    case 403: return "访问被禁止";
    case 404: return "未找到资源";
    case 429: return "请求过于频繁";
    case 500: return "服务器错误";
    case 502: return "上游服务异常";
    case 504: return "请求超时";
    default: return "出错了";
  }
});

const detail = computed(() => props.message || null);

const retryable = computed(() => {
  // 402/403 不可重试
  return props.code !== 402 && props.code !== 403;
});
</script>

<style scoped>
.error-state {
  text-align: center;
  padding: 64px 24px;
}
.error-state__icon {
  font-size: 48px;
  margin-bottom: 16px;
}
.error-state__title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}
.error-state__detail {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 24px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.error-state__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.error-state__btn {
  height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: #2563EB;
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.error-state__btn:hover { background: #1D4ED8; }
.error-state__btn--ghost {
  background: transparent;
  color: #6B7280;
  border: 1px solid #E5E7EB;
}
.error-state__btn--ghost:hover { background: #F3F4F6; color: #111827; }
</style>
