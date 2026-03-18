<template>
  <div class="api-docs">
    <el-card header="接口文档">
      <el-tabs v-model="activeModule">
        <el-tab-pane label="日志分析" name="log">
          <api-list :apis="logApis" />
        </el-tab-pane>
        <el-tab-pane label="调用链" name="callchain">
          <api-list :apis="callChainApis" />
        </el-tab-pane>
        <el-tab-pane label="项目管理" name="project">
          <api-list :apis="projectApis" />
        </el-tab-pane>
        <el-tab-pane label="运维监控" name="ops">
          <api-list :apis="opsApis" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ApiList from '@/components/ApiList.vue'

const activeModule = ref('log')

const logApis = [
  { method: 'POST', path: '/api/log/query', description: '查询日志' },
  { method: 'POST', path: '/api/log/analyze', description: '提交分析任务' },
  { method: 'GET', path: '/api/log/reports', description: '获取报告列表' },
  { method: 'GET', path: '/api/log/report/{id}', description: '获取报告详情' },
  { method: 'GET', path: '/api/log/report/{id}/status', description: '查询任务状态' }
]

const callChainApis = [
  { method: 'GET', path: '/api/callchain/projects', description: '获取项目列表' },
  { method: 'GET', path: '/api/callchain/uris', description: '获取URI列表' },
  { method: 'GET', path: '/api/callchain/calls', description: '获取调用链数据' },
  { method: 'GET', path: '/api/callchain/search', description: '搜索方法或类' }
]

const projectApis = [
  { method: 'GET', path: '/api/projects/list', description: '获取项目列表' },
  { method: 'POST', path: '/api/projects/clone', description: '克隆项目' },
  { method: 'GET', path: '/api/projects/status', description: '获取项目状态' }
]

const opsApis = [
  { method: 'GET', path: '/api/ops/health', description: '健康检查' },
  { method: 'POST', path: '/api/ops/analysis/impact', description: '影响范围分析' },
  { method: 'GET', path: '/api/ops/docs/interface', description: '生成接口文档' },
  { method: 'POST', path: '/api/ops/logs/download', description: '下载错误日志' }
]
</script>

<style scoped>
</style>