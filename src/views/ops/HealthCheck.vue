<template>
  <div class="health-check">
    <el-card header="服务健康状态">
      <el-row :gutter="20">
        <el-col :span="8" v-for="service in services" :key="service.name">
          <el-card shadow="hover" class="service-card">
            <div class="service-header">
              <el-icon :size="24" :color="service.healthy ? '#67c23a' : '#f56c6c'">
                <component :is="service.healthy ? 'CircleCheck' : 'CircleClose'" />
              </el-icon>
              <span class="service-name">{{ service.name }}</span>
            </div>
            <el-descriptions :column="1" size="small">
              <el-descriptions-item label="状态">
                <el-tag :type="service.healthy ? 'success' : 'danger'">
                  {{ service.healthy ? '健康' : '异常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="响应时间">{{ service.responseTime }}ms</el-descriptions-item>
              <el-descriptions-item label="最后检查">{{ service.lastCheck }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card header="系统资源" class="mt-4">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-statistic title="CPU使用率" :value="systemResources.cpu" suffix="%" />
          <el-progress :percentage="systemResources.cpu" :color="getProgressColor(systemResources.cpu)" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="内存使用率" :value="systemResources.memory" suffix="%" />
          <el-progress :percentage="systemResources.memory" :color="getProgressColor(systemResources.memory)" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="磁盘使用率" :value="systemResources.disk" suffix="%" />
          <el-progress :percentage="systemResources.disk" :color="getProgressColor(systemResources.disk)" />
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { opsApi } from '@/api/ops'

const services = ref<any[]>([])
const systemResources = reactive({
  cpu: 0,
  memory: 0,
  disk: 0
})

let refreshTimer: number | null = null

const getProgressColor = (value: number) => {
  if (value < 60) return '#67c23a'
  if (value < 80) return '#e6a23c'
  return '#f56c6c'
}

const loadHealthData = async () => {
  try {
    const res = await opsApi.getHealth()
    services.value = res.data?.services || []
    if (res.data?.resources) {
      Object.assign(systemResources, res.data.resources)
    }
  } catch (error) {
    console.error('Failed to load health data:', error)
  }
}

onMounted(() => {
  loadHealthData()
  refreshTimer = window.setInterval(loadHealthData, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.service-card {
  margin-bottom: 16px;
}
.service-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.service-name {
  margin-left: 8px;
  font-size: 16px;
  font-weight: 500;
}
.mt-4 {
  margin-top: 16px;
}
</style>