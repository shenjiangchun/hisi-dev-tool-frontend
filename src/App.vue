<script setup lang="ts">
import { ref } from 'vue'

const message = ref<string>('HiSi Dev Tool')
</script>

<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>{{ message }}</h1>
          <el-menu mode="horizontal" router :ellipsis="false">
            <el-menu-item index="/">首页</el-menu-item>
            <el-menu-item index="/about">关于</el-menu-item>
          </el-menu>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
}

.el-header {
  background-color: #409eff;
  color: #fff;
  padding: 0 20px;
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.header-content h1 {
  margin-right: 40px;
  font-size: 20px;
  font-weight: 500;
}

.el-menu--horizontal {
  border-bottom: none;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>