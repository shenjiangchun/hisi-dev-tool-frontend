<template>
  <div class="quick-actions">
    <!-- Used as Sender actions prop, no template needed -->
  </div>
</template>

<script setup lang="ts">
import type { SenderAction } from 'vue-element-plus-x'

/**
 * 快捷按钮配置
 */
export const quickActions: SenderAction[] = [
  {
    key: 'code-review',
    name: '代码审查',
    icon: 'Search',
    onClick: () => '请帮我审查当前项目的代码质量，重点检查 TypeScript 类型定义与 Vue 组件的响应式逻辑'
  },
  {
    key: 'explain',
    name: '代码解释',
    icon: 'Document',
    onClick: () => '请解释这段代码的业务逻辑与实现思路'
  },
  {
    key: 'fix-bug',
    name: 'Bug 分析',
    icon: 'Warning',
    onClick: () => '请帮我分析这个问题并提供修复建议'
  },
  {
    key: 'generate-test',
    name: '生成测试',
    icon: 'DocumentChecked',
    onClick: () => '请为这段代码生成单元测试'
  }
]

defineExpose({ quickActions })
</script>