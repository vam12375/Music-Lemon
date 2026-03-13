<template>
  <div class="error-state">
    <div class="error-state__icon" v-html="iconSvg"></div>
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

// 根据状态码映射 SVG 图标
const iconSvg = computed(() => {
  const stroke = 'currentColor';
  switch (props.code) {
    case 401: case 403:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
    case 402:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
    case 404:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    case 429:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    default:
      return `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
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
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}
.error-state__icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}
.error-state__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.error-state__detail {
  font-size: 14px;
  color: var(--text-secondary);
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
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--gradient-accent);
  color: var(--bg-deep);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: opacity .15s;
}
.error-state__btn:hover { opacity: 0.85; }
.error-state__btn--ghost {
  background: transparent;
  color: var(--accent);
  border: 1px solid var(--border-active);
}
.error-state__btn--ghost:hover { background: var(--accent-glow); }
</style>
