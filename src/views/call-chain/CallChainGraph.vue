<template>
  <div class="call-chain-graph">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <span>调用链可视化</span>
            <el-tag class="ml-2">{{ projectName }}</el-tag>
            <el-tag type="info" class="ml-2">{{ uri }}</el-tag>
          </div>
          <div>
            <el-button @click="goBack">返回</el-button>
            <el-button type="primary" @click="refresh">刷新</el-button>
          </div>
        </div>
      </template>
      <div ref="chartRef" class="chart-container" v-loading="loading"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import type { CallChainNode } from '@/types/callchain'
import { callChainApi } from '@/api/callChain'

const route = useRoute()
const router = useRouter()
const projectName = route.query.project as string || ''
const uri = route.query.uri as string || ''
const loading = ref(false)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const handleResize = () => chart?.resize()

const goBack = () => {
  router.push({
    path: '/call-chain/uris',
    query: { project: projectName }
  })
}

const refresh = () => {
  loadCallChain()
}

const initChart = (data: CallChainNode) => {
  if (!chartRef.value) return

  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove'
    },
    series: [
      {
        type: 'tree',
        data: [data],
        left: '2%',
        right: '2%',
        top: '8%',
        bottom: '20%',
        symbol: 'rect',
        orient: 'LR',
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 12
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left'
          }
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750
      }
    ]
  }

  chart.setOption(option)
}

const loadCallChain = async () => {
  loading.value = true
  try {
    const res = await callChainApi.getCalls({
      project: projectName,
      uri: uri
    })
    initChart(res.data)
  } catch (error) {
    ElMessage.error('加载调用链数据失败')
    console.error('Failed to load call chain:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCallChain()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.chart-container {
  width: 100%;
  height: 500px;
}
</style>