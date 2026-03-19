<template>
  <div class="chain-chart">
    <div class="chart-toolbar">
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button label="tree">Tree视图</el-radio-button>
        <el-radio-button label="graph">Graph视图</el-radio-button>
      </el-radio-group>
      <el-checkbox v-model="hideNoMatch" style="margin-left: 16px;">隐藏 no match 节点</el-checkbox>
    </div>
    <div ref="chartRef" class="chart-container" v-loading="loading">
      <div v-if="!data" class="empty-placeholder">
        <el-empty description="请选择项目并查询调用链" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  methodBody?: string
  isNoMatch?: boolean
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
const hideNoMatch = ref(true)
let chart: echarts.ECharts | null = null

const handleResize = () => chart?.resize()

/**
 * 过滤 no match 节点
 */
const filterNoMatchNodes = (node: ChainNode): ChainNode | null => {
  if (hideNoMatch.value && node.isNoMatch) {
    return null
  }

  const filteredNode: ChainNode = { ...node }
  if (node.children && node.children.length > 0) {
    filteredNode.children = node.children
      .map(child => filterNoMatchNodes(child))
      .filter((n): n is ChainNode => n !== null)
  }
  return filteredNode
}

const displayData = computed(() => {
  if (!props.data) return null
  return filterNoMatchNodes(props.data)
})

const initChart = () => {
  if (!chartRef.value) return

  if (chart) {
    chart.dispose()
  }

  if (!displayData.value) return

  chart = echarts.init(chartRef.value)

  const option = viewMode.value === 'tree'
    ? getTreeOption()
    : getGraphOption()

  chart.setOption(option)

  // 点击事件
  chart.on('click', (params: any) => {
    if (params.data) {
      emit('node-click', params.data, params.event.event)
    }
  })

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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#ddd',
    borderWidth: 1,
    padding: [10, 15],
    textStyle: {
      color: '#333',
      fontSize: 13
    },
    formatter: (params: any) => {
      const data = params.data
      let html = `<div style="max-width: 400px;">
        <div style="font-weight: bold; color: ${data.isNoMatch ? '#999' : '#409EFF'}; font-size: 14px; margin-bottom: 6px;">
          ${data.isNoMatch ? '⚠️ ' : ''}${data.name}
        </div>`
      if (data.className) {
        html += `<div style="color: #666; font-size: 12px; margin-bottom: 4px;">
          <span style="color: #999;">Class:</span> ${data.className}
        </div>`
      }
      if (data.methodSignature) {
        html += `<div style="color: #666; font-size: 12px; margin-bottom: 4px; word-break: break-all;">
          <span style="color: #999;">Signature:</span> ${data.methodSignature.substring(0, 100)}${data.methodSignature.length > 100 ? '...' : ''}
        </div>`
      }
      if (data.isNoMatch) {
        html += `<div style="color: #E6A23C; font-size: 12px; margin-top: 6px;">
          ⚡ 非项目代码方法（JDK/第三方库）
        </div>`
      }
      html += '</div>'
      return html
    }
  },
  series: [{
    type: 'tree',
    data: [displayData.value],
    left: '10%',
    right: '20%',
    top: '5%',
    bottom: '10%',
    symbol: (_value: any, params: any) => {
      const isNoMatch = params.data?.isNoMatch
      return isNoMatch ? 'diamond' : 'rect'
    },
    symbolSize: [140, 36],
    orient: 'LR',
    initialTreeDepth: 3,
    label: {
      show: true,
      position: 'inside',
      verticalAlign: 'middle',
      fontSize: 12,
      color: '#333',
      formatter: (params: any) => {
        const name = params.data?.name || ''
        // 截断过长的名称
        return name.length > 18 ? name.substring(0, 16) + '...' : name
      }
    },
    itemStyle: {
      color: (params: any) => {
        return params.data?.isNoMatch ? '#F5F7FA' : '#ECF5FF'
      },
      borderColor: (params: any) => {
        return params.data?.isNoMatch ? '#C0C4CC' : '#409EFF'
      },
      borderWidth: 1,
      borderRadius: 4
    },
    lineStyle: {
      color: '#C0C4CC',
      width: 1.5,
      curveness: 0.5
    },
    leaves: {
      label: {
        show: true,
        position: 'inside',
        verticalAlign: 'middle'
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
  const nodeMap = new Map<string, string>() // signature -> nodeId

  const traverse = (node: ChainNode, parentId?: string, depth = 0) => {
    const signature = node.methodSignature || node.name
    let nodeId = nodeMap.get(signature)

    if (!nodeId) {
      nodeId = nodes.length.toString()
      nodeMap.set(signature, nodeId)

      nodes.push({
        id: nodeId,
        name: node.name,
        className: node.className,
        methodSignature: node.methodSignature,
        methodBody: node.methodBody,
        isNoMatch: node.isNoMatch,
        symbolSize: Math.max(30, 60 - depth * 5),
        category: node.isNoMatch ? 1 : 0,
        depth: depth,
        itemStyle: {
          color: node.isNoMatch ? '#F5F7FA' : '#ECF5FF',
          borderColor: node.isNoMatch ? '#C0C4CC' : '#409EFF',
          borderWidth: 2
        }
      })
    }

    if (parentId !== undefined) {
      // 避免重复连接
      if (!links.some(l => l.source === parentId && l.target === nodeId)) {
        links.push({
          source: parentId,
          target: nodeId,
          lineStyle: {
            color: '#C0C4CC',
            width: 1.5,
            curveness: 0.2
          }
        })
      }
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, nodeId, depth + 1))
    }
  }

  if (displayData.value) {
    traverse(displayData.value)
  }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ddd',
      borderWidth: 1,
      padding: [10, 15],
      textStyle: {
        color: '#333',
        fontSize: 13
      },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const data = params.data
          let html = `<div style="max-width: 400px;">
            <div style="font-weight: bold; color: ${data.isNoMatch ? '#999' : '#409EFF'}; font-size: 14px; margin-bottom: 6px;">
              ${data.isNoMatch ? '⚠️ ' : ''}${data.name}
            </div>`
          if (data.className) {
            html += `<div style="color: #666; font-size: 12px;">
              <span style="color: #999;">Class:</span> ${data.className}
            </div>`
          }
          if (data.isNoMatch) {
            html += `<div style="color: #E6A23C; font-size: 12px; margin-top: 6px;">
              ⚡ 非项目代码方法
            </div>`
          }
          html += '</div>'
          return html
        }
        return ''
      }
    },
    legend: {
      data: ['项目方法', '外部方法'],
      bottom: 10
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      roam: true,
      draggable: true,
      categories: [
        { name: '项目方法', itemStyle: { color: '#ECF5FF' } },
        { name: '外部方法', itemStyle: { color: '#F5F7FA' } }
      ],
      label: {
        show: true,
        position: 'bottom',
        fontSize: 11,
        color: '#333',
        formatter: (params: any) => {
          const name = params.data?.name || ''
          return name.length > 12 ? name.substring(0, 10) + '...' : name
        }
      },
      force: {
        repulsion: 200,
        edgeLength: [50, 150],
        gravity: 0.1
      },
      emphasis: {
        focus: 'adjacency',
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        },
        lineStyle: {
          width: 3
        }
      }
    }]
  }
}

watch(displayData, initChart, { deep: true })
watch([viewMode, hideNoMatch], initChart)

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
  padding: 12px 0;
  display: flex;
  align-items: center;
}

.chart-container {
  flex: 1;
  min-height: 500px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  background: #FAFAFA;
}

.empty-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>