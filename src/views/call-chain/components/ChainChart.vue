<template>
  <div class="chain-chart">
    <div class="chart-toolbar">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button label="tree">Tree视图</el-radio-button>
        <el-radio-button label="graph">Graph视图</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" class="chart-container" v-loading="loading"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  children?: ChainNode[]
}

const props = defineProps<{
  data: ChainNode | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'node-click', node: ChainNode, event: MouseEvent): void
  (e: 'node-contextmenu', node: ChainNode, event: MouseEvent): void
}>()

const chartRef = ref<HTMLElement>()
const viewMode = ref<'tree' | 'graph'>('tree')
let chart: echarts.ECharts | null = null

const handleResize = () => chart?.resize()

const initChart = () => {
  if (!chartRef.value || !props.data) return

  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)

  const option = viewMode.value === 'tree'
    ? getTreeOption()
    : getGraphOption()

  chart.setOption(option)

  // 右键菜单事件
  chart.on('contextmenu', (params: any) => {
    if (params.data) {
      emit('node-contextmenu', params.data, params.event.event)
    }
  })
}

const getTreeOption = () => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => {
      const data = params.data
      return `<div>
        <div><strong>${data.name}</strong></div>
        ${data.className ? `<div style="color:#999">${data.className}</div>` : ''}
      </div>`
    }
  },
  series: [{
    type: 'tree',
    data: [props.data],
    left: '2%',
    right: '2%',
    top: '8%',
    bottom: '20%',
    symbol: 'rect',
    symbolSize: [120, 30],
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
  }]
})

const getGraphOption = () => {
  const nodes: any[] = []
  const links: any[] = []

  const traverse = (node: ChainNode, parentId?: string) => {
    const nodeId = nodes.length.toString()
    nodes.push({
      id: nodeId,
      name: node.name,
      className: node.className,
      methodSignature: node.methodSignature,
      symbolSize: 50,
      category: 0
    })

    if (parentId !== undefined) {
      links.push({
        source: parentId,
        target: nodeId
      })
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, nodeId))
    }
  }

  if (props.data) {
    traverse(props.data)
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          return `<div>
            <div><strong>${params.data.name}</strong></div>
            ${params.data.className ? `<div style="color:#999">${params.data.className}</div>` : ''}
          </div>`
        }
        return ''
      }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      roam: true,
      label: {
        show: true,
        position: 'right',
        fontSize: 12
      },
      force: {
        repulsion: 100,
        edgeLength: 80
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 10
        }
      }
    }]
  }
}

watch(() => props.data, initChart, { deep: true })
watch(viewMode, initChart)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chain-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-toolbar {
  padding: 8px 0;
}

.chart-container {
  flex: 1;
  min-height: 400px;
}
</style>