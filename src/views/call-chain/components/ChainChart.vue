<template>
  <div class="chain-chart">
    <!-- 工具栏 -->
    <div class="chart-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="tree">
            <el-icon><Share /></el-icon> 树形视图
          </el-radio-button>
          <el-radio-button value="graph">
            <el-icon><Connection /></el-icon> 关系图
          </el-radio-button>
          <el-radio-button value="list">
            <el-icon><List /></el-icon> 列表视图
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索方法名..."
          prefix-icon="Search"
          clearable
          style="width: 200px;"
        />
        <el-checkbox v-model="hideNoMatch" style="margin-left: 16px;">
          隐藏外部依赖
        </el-checkbox>
        <el-button-group style="margin-left: 12px;">
          <el-button :icon="ZoomOut" @click="zoomOut" title="缩小" />
          <el-button :icon="ZoomIn" @click="zoomIn" title="放大" />
          <el-button :icon="RefreshRight" @click="resetZoom" title="重置" />
        </el-button-group>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar" v-if="displayData">
      <div class="stat-item">
        <span class="stat-label">总节点</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-item project">
        <span class="stat-label">项目方法</span>
        <span class="stat-value">{{ stats.project }}</span>
      </div>
      <div class="stat-item external">
        <span class="stat-label">外部依赖</span>
        <span class="stat-value">{{ stats.external }}</span>
      </div>
      <div class="stat-item depth">
        <span class="stat-label">最大深度</span>
        <span class="stat-value">{{ stats.maxDepth }}</span>
      </div>
    </div>

    <!-- 图表容器 -->
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart-container" v-loading="loading" v-show="viewMode !== 'list'">
        <div v-if="!data" class="empty-placeholder">
          <el-empty description="请选择项目并查询调用链">
            <template #image>
              <el-icon :size="80" color="#C0C4CC"><Share /></el-icon>
            </template>
          </el-empty>
        </div>
      </div>

      <!-- 列表视图 -->
      <div class="list-view" v-if="viewMode === 'list' && flatList.length > 0">
        <div
          v-for="item in filteredFlatList"
          :key="item.id"
          class="list-item"
          :class="{ 'is-external': item.isNoMatch, 'is-root': item.depth === 0 }"
          :style="{ paddingLeft: (item.depth * 24 + 16) + 'px' }"
          @click="handleNodeClick(item)"
        >
          <div class="item-depth" :style="{ background: getDepthColor(item.depth) }">
            {{ item.depth }}
          </div>
          <div class="item-content">
            <div class="item-header">
              <el-tag
                :type="item.isNoMatch ? 'info' : 'primary'"
                size="small"
                effect="plain"
                class="item-tag"
              >
                {{ item.isNoMatch ? '外部' : '项目' }}
              </el-tag>
              <span class="item-name" v-html="highlightKeyword(item.name)"></span>
            </div>
            <div class="item-meta" v-if="item.className">
              <el-icon><Folder /></el-icon>
              <span>{{ item.className }}</span>
            </div>
          </div>
          <el-icon class="item-arrow" v-if="hasChildren(item)">
            <ArrowRight />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 详情面板 -->
    <el-drawer
      v-model="showDetail"
      title="方法详情"
      direction="rtl"
      size="400px"
    >
      <div class="detail-content" v-if="selectedNode">
        <div class="detail-section">
          <div class="detail-label">方法名</div>
          <div class="detail-value method-name">{{ selectedNode.name }}</div>
        </div>
        <div class="detail-section" v-if="selectedNode.className">
          <div class="detail-label">所属类</div>
          <div class="detail-value">
            <el-tag type="success" effect="plain">{{ selectedNode.className }}</el-tag>
          </div>
        </div>
        <div class="detail-section" v-if="selectedNode.methodSignature">
          <div class="detail-label">方法签名</div>
          <div class="detail-value code-block">{{ selectedNode.methodSignature }}</div>
        </div>
        <div class="detail-section" v-if="selectedNode.methodBody">
          <div class="detail-label">方法体</div>
          <div class="detail-value code-block method-body">{{ selectedNode.methodBody }}</div>
        </div>
        <div class="detail-section" v-if="selectedNode.isNoMatch">
          <el-alert
            title="外部依赖方法"
            description="此方法来自JDK或第三方库，不在当前项目代码中"
            type="warning"
            show-icon
            :closable="false"
          />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import {
  Share, Connection, List, ZoomIn, ZoomOut, RefreshRight,
  Folder, ArrowRight
} from '@element-plus/icons-vue'

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
const viewMode = ref<'tree' | 'graph' | 'list'>('tree')
const hideNoMatch = ref(true)
const searchKeyword = ref('')
const showDetail = ref(false)
const selectedNode = ref<ChainNode | null>(null)
let chart: echarts.ECharts | null = null
let zoomLevel = 1

// 配色方案
const COLORS = {
  primary: '#6366f1',      // 靛蓝
  primaryLight: '#e0e7ff',
  secondary: '#8b5cf6',    // 紫色
  success: '#10b981',      // 绿色
  warning: '#f59e0b',      // 橙色
  info: '#64748b',         // 灰色
  gradient: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'],
  depthColors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']
}

// 计算统计数据
const stats = computed(() => {
  let total = 0
  let project = 0
  let external = 0
  let maxDepth = 0

  const countNodes = (node: ChainNode, depth = 0) => {
    if (hideNoMatch.value && node.isNoMatch) return
    total++
    if (node.isNoMatch) external++
    else project++
    maxDepth = Math.max(maxDepth, depth)
    if (node.children) {
      node.children.forEach(child => countNodes(child, depth + 1))
    }
  }

  if (props.data) countNodes(props.data)
  return { total, project, external, maxDepth }
})

// 过滤节点
const filterNoMatchNodes = (node: ChainNode): ChainNode | null => {
  if (hideNoMatch.value && node.isNoMatch) return null

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

// 扁平化列表
const flatList = computed(() => {
  const list: (ChainNode & { depth: number; id: string })[] = []
  let idCounter = 0

  const flatten = (node: ChainNode, depth = 0, parentId = '') => {
    if (hideNoMatch.value && node.isNoMatch) return
    const id = `${parentId}_${idCounter++}`
    list.push({ ...node, depth, id })
    if (node.children) {
      node.children.forEach(child => flatten(child, depth + 1, id))
    }
  }

  if (props.data) flatten(props.data)
  return list
})

// 搜索过滤
const filteredFlatList = computed(() => {
  if (!searchKeyword.value) return flatList.value
  const keyword = searchKeyword.value.toLowerCase()
  return flatList.value.filter(item =>
    item.name.toLowerCase().includes(keyword) ||
    (item.className && item.className.toLowerCase().includes(keyword))
  )
})

// 高亮关键词
const highlightKeyword = (text: string) => {
  if (!searchKeyword.value) return text
  const regex = new RegExp(`(${searchKeyword.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// 获取深度颜色
const getDepthColor = (depth: number) => {
  return COLORS.depthColors[depth % COLORS.depthColors.length]
}

// 检查是否有子节点
const hasChildren = (node: ChainNode) => {
  return node.children && node.children.length > 0
}

// 处理节点点击
const handleNodeClick = (node: ChainNode) => {
  selectedNode.value = node
  showDetail.value = true
  emit('node-click', node, new MouseEvent('click'))
}

// 缩放控制
const zoomIn = () => {
  zoomLevel = Math.min(zoomLevel * 1.2, 3)
  chart?.setOption({ series: [{ zoom: zoomLevel }] })
}

const zoomOut = () => {
  zoomLevel = Math.max(zoomLevel / 1.2, 0.3)
  chart?.setOption({ series: [{ zoom: zoomLevel }] })
}

const resetZoom = () => {
  zoomLevel = 1
  initChart()
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value || !displayData.value) return

  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value, undefined, { renderer: 'canvas' })

  const option = viewMode.value === 'tree' ? getTreeOption() : getGraphOption()
  chart.setOption(option)

  chart.on('click', (params: any) => {
    if (params.data) {
      handleNodeClick(params.data)
    }
  })
}

// 树形视图配置
const getTreeOption = () => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: [12, 16],
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    textStyle: { color: '#374151', fontSize: 13 },
    extraCssText: 'box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);',
    formatter: (params: any) => {
      const data = params.data
      const typeTag = data.isNoMatch ?
        '<span style="color:#f59e0b">⚡ 外部依赖</span>' :
        '<span style="color:#10b981">✓ 项目方法</span>'
      return `
        <div style="min-width:200px;max-width:400px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${typeTag}
          </div>
          <div style="font-size:15px;font-weight:600;color:#1f2937;margin-bottom:4px">${data.name}</div>
          ${data.className ? `<div style="color:#6b7280;font-size:12px;margin-bottom:4px">📦 ${data.className}</div>` : ''}
          ${data.methodSignature ? `<div style="color:#9ca3af;font-size:11px;word-break:break-all">签名: ${data.methodSignature.substring(0,80)}${data.methodSignature.length > 80 ? '...' : ''}</div>` : ''}
        </div>
      `
    }
  },
  series: [{
    type: 'tree',
    data: [displayData.value],
    left: '8%',
    right: '25%',
    top: '8%',
    bottom: '8%',
    symbol: 'roundRect',
    symbolSize: [160, 44],
    orient: 'LR',
    initialTreeDepth: 4,
    roam: true,
    zoom: zoomLevel,
    label: {
      show: true,
      position: 'inside',
      verticalAlign: 'middle',
      fontSize: 12,
      fontWeight: 500,
      color: '#1f2937',
      formatter: (params: any) => {
        const name = params.data?.name || ''
        return name.length > 16 ? name.substring(0, 14) + '…' : name
      }
    },
    itemStyle: {
      color: (params: any) => {
        if (params.data?.isNoMatch) return '#fef3c7'
        return '#e0e7ff'
      },
      borderColor: (params: any) => {
        if (params.data?.isNoMatch) return '#f59e0b'
        return '#6366f1'
      },
      borderWidth: 2,
      borderRadius: 8,
      shadowColor: 'rgba(99, 102, 241, 0.15)',
      shadowBlur: 8,
      shadowOffsetY: 2
    },
    lineStyle: {
      color: '#c7d2fe',
      width: 2,
      curveness: 0.6
    },
    emphasis: {
      focus: 'descendant',
      itemStyle: {
        color: '#c7d2fe',
        borderColor: '#4f46e5',
        borderWidth: 3,
        shadowBlur: 12
      },
      lineStyle: {
        width: 3
      }
    },
    leaves: {
      label: { show: true, position: 'inside' }
    },
    expandAndCollapse: true,
    animationDuration: 450,
    animationDurationUpdate: 750
  }]
})

// 关系图配置
const getGraphOption = () => {
  const nodes: any[] = []
  const links: any[] = []
  const nodeMap = new Map<string, string>()

  const traverse = (node: ChainNode, parentId?: string, depth = 0) => {
    const signature = node.methodSignature || node.name
    let nodeId = nodeMap.get(signature)

    if (!nodeId) {
      nodeId = nodes.length.toString()
      nodeMap.set(signature, nodeId)

      const baseSize = 65
      const sizeReduction = depth * 8
      const finalSize = Math.max(35, baseSize - sizeReduction)

      nodes.push({
        id: nodeId,
        name: node.name,
        className: node.className,
        methodSignature: node.methodSignature,
        methodBody: node.methodBody,
        isNoMatch: node.isNoMatch,
        symbolSize: finalSize,
        category: node.isNoMatch ? 1 : 0,
        depth: depth,
        value: finalSize
      })
    }

    if (parentId !== undefined && !links.some(l => l.source === parentId && l.target === nodeId)) {
      links.push({
        source: parentId,
        target: nodeId,
        value: 1
      })
    }

    if (node.children) {
      node.children.forEach(child => traverse(child, nodeId, depth + 1))
    }
  }

  if (displayData.value) traverse(displayData.value)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: [12, 16],
      textStyle: { color: '#374151', fontSize: 13 },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const data = params.data
          const typeTag = data.isNoMatch ?
            '<span style="color:#f59e0b">⚡ 外部依赖</span>' :
            '<span style="color:#10b981">✓ 项目方法</span>'
          return `
            <div style="min-width:180px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">${typeTag}</div>
              <div style="font-size:14px;font-weight:600;color:#1f2937">${data.name}</div>
              ${data.className ? `<div style="color:#6b7280;font-size:11px;margin-top:4px">📦 ${data.className}</div>` : ''}
            </div>
          `
        }
        return ''
      }
    },
    legend: {
      data: ['项目方法', '外部依赖'],
      bottom: 16,
      itemGap: 24,
      textStyle: { fontSize: 13 }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      data: nodes,
      links: links,
      roam: true,
      draggable: true,
      zoom: zoomLevel,
      categories: [
        {
          name: '项目方法',
          itemStyle: { color: '#6366f1' },
          label: { show: true }
        },
        {
          name: '外部依赖',
          itemStyle: { color: '#f59e0b' },
          label: { show: true }
        }
      ],
      label: {
        show: true,
        position: 'bottom',
        fontSize: 11,
        fontWeight: 500,
        color: '#374151',
        formatter: (params: any) => {
          const name = params.data?.name || ''
          return name.length > 10 ? name.substring(0, 8) + '…' : name
        }
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#fff'
      },
      force: {
        repulsion: 350,
        edgeLength: [80, 200],
        gravity: 0.08,
        friction: 0.6
      },
      emphasis: {
        focus: 'adjacency',
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(99, 102, 241, 0.4)'
        },
        lineStyle: {
          width: 4,
          color: '#6366f1'
        }
      },
      lineStyle: {
        color: '#c7d2fe',
        width: 2,
        curveness: 0.15,
        opacity: 0.8
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [0, 6]
    }]
  }
}

// 响应式
const handleResize = () => chart?.resize()

watch(displayData, initChart, { deep: true })
watch(viewMode, initChart)
watch(hideNoMatch, initChart)

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
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  overflow: hidden;
}

.chart-toolbar {
  padding: 16px 20px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-bar {
  padding: 12px 20px;
  background: linear-gradient(90deg, #fff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
}

.stat-item.project .stat-value { color: #10b981; }
.stat-item.external .stat-value { color: #f59e0b; }
.stat-item.depth .stat-value { color: #6366f1; }

.chart-wrapper {
  flex: 1;
  min-height: 0;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.empty-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

/* 列表视图样式 */
.list-view {
  height: 100%;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.list-item:hover {
  background: #f8fafc;
  border-color: #c7d2fe;
  transform: translateX(4px);
}

.list-item.is-external {
  background: #fefce8;
  border-color: #fde047;
}

.list-item.is-root {
  background: linear-gradient(90deg, #e0e7ff 0%, #fff 100%);
  border-color: #a5b4fc;
}

.item-depth {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-tag {
  flex-shrink: 0;
}

.item-name {
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name :deep(mark) {
  background: #fef08a;
  padding: 0 2px;
  border-radius: 2px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.item-arrow {
  color: #9ca3af;
}

/* 详情面板样式 */
.detail-content {
  padding: 0 16px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  color: #1f2937;
}

.detail-value.method-name {
  font-size: 18px;
  font-weight: 600;
  color: #4f46e5;
}

.code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.method-body {
  max-height: 300px;
  overflow-y: auto;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>