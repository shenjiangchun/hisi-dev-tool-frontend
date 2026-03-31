<script setup lang="ts">
import { Document, Share, Folder, Cpu, Monitor, Setting } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import type { Component } from 'vue'
import { useAppStore } from '@/stores/app'

// Define menu key type that matches availableMenus keys
type MenuKey = 'call-chain' | 'log-analysis' | 'ops' | 'project-management' | 'mcp-guide' | 'claude-terminal' | 'prompt-config'

interface MenuItem {
  index: string
  title: string
  icon: Component
  menuKey: MenuKey
  children?: { index: string; title: string }[]
}

const route = useRoute()
const appStore = useAppStore()

const baseMenuItems: MenuItem[] = [
  {
    index: '/mcp-guide',
    title: 'MCP 使用指南',
    icon: Cpu,
    menuKey: 'mcp-guide'
  },
  {
    index: '/claude-terminal',
    title: 'Claude 终端',
    icon: Monitor,
    menuKey: 'claude-terminal'
  },
  {
    index: '/log-analysis',
    title: '日志分析',
    icon: Document,
    menuKey: 'log-analysis'
  },
  {
    index: '/prompt-config',
    title: '提示词配置',
    icon: Setting,
    menuKey: 'prompt-config'
  },
  {
    index: '/call-chain',
    title: '调用链分析',
    icon: Share,
    menuKey: 'call-chain',
    children: [
      { index: '/call-chain/uri-chain', title: '接口调用链查询' },
      { index: '/call-chain/method-reference', title: '方法引用关系分析' }
    ]
  },
  {
    index: '/project',
    title: '项目管理',
    icon: Folder,
    menuKey: 'project-management'
  }
]

const menuItems = computed(() =>
  baseMenuItems.map(item => ({
    ...item,
    disabled: !appStore.availableMenus[item.menuKey]
  }))
)

// Check if a submenu should be opened based on current route
const defaultOpeneds = computed(() => {
  const openeds: string[] = []
  menuItems.value.forEach(item => {
    if (item.children && item.children.some(child => route.path.startsWith(child.index))) {
      openeds.push(item.index)
    }
  })
  return openeds
})
</script>

<template>
  <el-aside class="app-sidebar" width="220px">
    <el-menu
      :default-active="route.path"
      :default-openeds="defaultOpeneds"
      class="sidebar-menu"
      router
    >
      <template v-for="item in menuItems" :key="item.index">
        <!-- Submenu for items with children -->
        <el-sub-menu v-if="item.children && !item.disabled" :index="item.index">
          <template #title>
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span>{{ item.title }}</span>
          </template>
          <el-menu-item
            v-for="child in item.children"
            :key="child.index"
            :index="child.index"
          >
            {{ child.title }}
          </el-menu-item>
        </el-sub-menu>
        <!-- Regular menu item for items without children -->
        <el-menu-item
          v-else
          :index="item.index"
          :disabled="item.disabled"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </template>
    </el-menu>
  </el-aside>
</template>

<style scoped>
.app-sidebar {
  background-color: #304156;
  height: 100%;
  overflow: hidden;
}

.sidebar-menu {
  border-right: none;
  background-color: #304156;
  height: 100%;
  width: 100% !important;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  color: #bfcbd9;
  background-color: #304156;
  height: 56px;
  line-height: 56px;
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  background-color: #263445;
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #409eff;
  background-color: #263445;
}

.sidebar-menu :deep(.el-menu-item .el-icon),
.sidebar-menu :deep(.el-sub-menu__title .el-icon) {
  color: inherit;
}

.sidebar-menu :deep(.el-menu-item.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Submenu items styling */
.sidebar-menu :deep(.el-sub-menu .el-menu-item) {
  background-color: #1f2d3d;
  min-width: auto;
  padding-left: 50px !important;
}

.sidebar-menu :deep(.el-sub-menu .el-menu-item:hover) {
  background-color: #263445;
}
</style>