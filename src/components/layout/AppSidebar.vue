<script setup lang="ts">
import { Document, Share, Folder, Monitor } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = [
  {
    index: '/log-analysis',
    title: '日志分析',
    icon: Document
  },
  {
    index: '/call-chain',
    title: '调用链分析',
    icon: Share
  },
  {
    index: '/project',
    title: '项目管理',
    icon: Folder
  },
  {
    index: '/ops',
    title: '运维监控',
    icon: Monitor
  }
]
</script>

<template>
  <el-aside class="app-sidebar" width="220px">
    <el-menu
      :default-active="route.path"
      class="sidebar-menu"
      router
    >
      <el-menu-item
        v-for="item in menuItems"
        :key="item.index"
        :index="item.index"
      >
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
        <span>{{ item.title }}</span>
      </el-menu-item>
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

.sidebar-menu :deep(.el-menu-item) {
  color: #bfcbd9;
  background-color: #304156;
  height: 56px;
  line-height: 56px;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background-color: #263445;
  color: #fff;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #409eff;
  background-color: #263445;
}

.sidebar-menu :deep(.el-menu-item .el-icon) {
  color: inherit;
}
</style>