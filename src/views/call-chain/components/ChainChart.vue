<template>
  <div class="chain-container" @contextmenu.prevent>
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button value="tree">树形结构</el-radio-button>
          <el-radio-button value="flow">流程图</el-radio-button>
          <el-radio-button value="list">列表视图</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchText"
          placeholder="搜索方法..."
          clearable
          style="width: 200px;"
        />
        <el-switch
          v-model="showExternal"
          active-text="显示外部"
          inactive-text="隐藏外部"
          style="margin-left: 16px;"
        />
      </div>
    </div>

    <!-- 统计栏 -->
    <div class="stats-bar" v-if="filteredNodes.length">
      <div class="stat-item">
        <span class="stat-value">{{ filteredNodes.length }}</span>
        <span class="stat-label">节点</span>
      </div>
      <div class="stat-item project">
        <span class="stat-value">{{ projectCount }}</span>
        <span class="stat-label">项目方法</span>
      </div>
      <div class="stat-item external" v-if="showExternal">
        <span class="stat-value">{{ externalCount }}</span>
        <span class="stat-label">外部依赖</span>
      </div>
      <div class="stat-item depth">
        <span class="stat-value">{{ maxDepth }}</span>
        <span class="stat-label">最大深度</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area" v-loading="loadingRecursive">
      <!-- 空状态 -->
      <div v-if="!data" class="empty-state">
        <div class="empty-icon">请选择项目和接口查询调用链</div>
      </div>

      <!-- 树形视图 -->
      <div v-else-if="viewMode === 'tree'" class="tree-view">
        <template v-for="node in rootNodes" :key="node.id">
          <TreeNode
            :node="node"
            :level="0"
            :search="searchText"
            :hide-external="!showExternal"
            @select="handleSelect"
            @contextmenu="handleContextMenu"
          />
        </template>
      </div>

      <!-- 流程图视图 - 按层级展示 -->
      <div v-else-if="viewMode === 'flow'" class="flow-view">
        <div class="flow-container">
          <div
            v-for="depth in flowDepthRange"
            :key="depth"
            class="flow-level"
          >
            <div class="level-header">
              <span class="level-badge">层级 {{ depth }}</span>
            </div>
            <div class="level-nodes">
              <div
                v-for="node in getNodesByDepth(depth)"
                :key="node.id"
                class="flow-node"
                :class="{
                  'is-external': node.isNoMatch,
                  'is-match': isMatch(node),
                  'is-root': depth === 0
                }"
                @click="handleSelect(node)"
                @contextmenu.prevent="handleContextMenu($event, node)"
              >
                <div class="node-icon" v-if="depth === 0">START</div>
                <div class="node-name">{{ node.name }}</div>
                <div class="node-class" v-if="node.className">{{ shortClass(node.className) }}</div>
                <div class="node-tag" v-if="node.isNoMatch">外部</div>
              </div>
            </div>
            <div class="level-arrow" v-if="depth < maxDepth">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#409eff" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" transform="rotate(90 12 12)"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 列表视图 - 表格样式 -->
      <div v-else class="list-view">
        <div class="list-table">
          <div class="list-header">
            <div class="col-depth">层级</div>
            <div class="col-method">方法名</div>
            <div class="col-class">所属类</div>
            <div class="col-type">类型</div>
            <div class="col-action">操作</div>
          </div>
          <div class="list-body">
            <div
              v-for="node in filteredNodes"
              :key="node.id"
              class="list-row"
              :class="{
                'is-external': node.isNoMatch,
                'is-match': isMatch(node),
                'depth-0': node.depth === 0,
                'depth-1': node.depth === 1,
                'depth-2': node.depth === 2,
                'depth-3': node.depth === 3
              }"
            >
              <div class="col-depth">
                <span class="depth-badge" :data-depth="node.depth">{{ node.depth }}</span>
              </div>
              <div class="col-method">
                <div class="method-indent" :style="{ width: node.depth * 20 + 'px' }"></div>
                <span class="method-name" v-html="highlightText(node.name)" @click="handleSelect(node)"></span>
              </div>
              <div class="col-class">{{ node.className ? shortClass(node.className) : '-' }}</div>
              <div class="col-type">
                <el-tag :type="node.isNoMatch ? 'warning' : 'success'" size="small">
                  {{ node.isNoMatch ? '外部' : '项目' }}
                </el-tag>
              </div>
              <div class="col-action">
                <el-button-group size="small">
                  <el-button type="primary" link @click="queryUpstreamForNode(node)" title="向上查询">
                    <span>↑</span>
                  </el-button>
                  <el-button type="success" link @click="queryDownstreamForNode(node)" title="向下查询">
                    <span>↓</span>
                  </el-button>
                  <el-button link @click="handleSelect(node)" title="查看详情">
                    详情
                  </el-button>
                </el-button-group>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="menu-item" @click="goToUpstream">
        <span class="menu-icon">↑</span>
        <span>向上依赖分析</span>
      </div>
      <div class="menu-item" @click="goToDownstream">
        <span class="menu-icon">↓</span>
        <span>向下依赖分析</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="queryUpstream">
        <span class="menu-icon">🔍</span>
        <span>向上查询调用链（弹窗）</span>
      </div>
      <div class="menu-item" @click="queryDownstream">
        <span class="menu-icon">🔍</span>
        <span>向下查询调用链（弹窗）</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="viewDetails">
        <span class="menu-icon">📋</span>
        <span>查看详情</span>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="showDetail"
      title="方法详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="detail-content" v-if="selectedNode">
        <div class="detail-row">
          <span class="detail-label">方法名称</span>
          <span class="detail-value name">{{ selectedNode.name }}</span>
        </div>
        <div class="detail-row" v-if="selectedNode.className">
          <span class="detail-label">所属类</span>
          <span class="detail-value">{{ selectedNode.className }}</span>
        </div>
        <div class="detail-row" v-if="selectedNode.methodSignature">
          <span class="detail-label">方法签名</span>
          <pre class="detail-code">{{ selectedNode.methodSignature }}</pre>
        </div>
        <div class="detail-row" v-if="selectedNode.methodBody">
          <span class="detail-label">方法实现</span>
          <pre class="detail-code body">{{ selectedNode.methodBody }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="queryUpstreamFromDialog" type="primary" plain>
          向上查询调用链
        </el-button>
        <el-button @click="queryDownstreamFromDialog" type="success" plain>
          向下查询调用链
        </el-button>
        <el-button @click="showDetail = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 递归查询结果弹窗 -->
    <el-dialog
      v-model="showRecursiveResult"
      :title="recursiveTitle"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="recursive-content" v-loading="loadingRecursive">
        <div v-if="recursiveData.length === 0 && !loadingRecursive" class="no-result">
          未找到相关数据
        </div>
        <!-- 向上查询 - URI列表 -->
        <div v-else-if="isUpstreamQuery" class="uri-list">
          <div class="uri-count">共找到 {{ recursiveData.length }} 个接口调用此方法</div>
          <div
            v-for="(item, index) in recursiveData"
            :key="index"
            class="uri-item"
          >
            <span class="uri-index">{{ index + 1 }}</span>
            <span class="uri-text">{{ item.uri || item.rootUri }}</span>
          </div>
        </div>
        <!-- 向下查询 - 调用链 -->
        <div v-else class="recursive-list">
          <div
            v-for="(node, index) in recursiveData"
            :key="index"
            class="recursive-row"
            :style="{ marginLeft: (node.depth || 0) * 24 + 'px' }"
          >
            <span class="recursive-depth">{{ node.depth || 0 }}</span>
            <span class="recursive-name">{{ node.method || node.name }}</span>
            <span class="recursive-package" v-if="node.package">{{ node.package }}</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TreeNode from './TreeNode.vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  methodBody?: string
  isNoMatch?: boolean
  children?: ChainNode[]
  id?: string
  depth?: number
  method?: string
  package?: string
  uri?: string
}

const props = defineProps<{
  data: ChainNode | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'node-click', node: ChainNode, event: MouseEvent): void
  (e: 'recursive-query', type: 'upstream' | 'downstream', method: string, className: string): void
  (e: 'navigate-method-ref', direction: 'up' | 'down', className: string, methodName: string): void
}>()

const viewMode = ref<'tree' | 'flow' | 'list'>('tree')
const searchText = ref('')
const showExternal = ref(false)
const showDetail = ref(false)
const selectedNode = ref<ChainNode | null>(null)

// 右键菜单状态
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  node: null as ChainNode | null
})

// 递归查询状态
const loadingRecursive = ref(false)
const showRecursiveResult = ref(false)
const recursiveTitle = ref('')
const recursiveData = ref<ChainNode[]>([])
const isUpstreamQuery = ref(false)

// 扁平化节点
const flatNodes = computed(() => {
  const nodes: (ChainNode & { id: string; depth: number })[] = []
  let idCounter = 0

  const flatten = (node: ChainNode, depth = 0) => {
    const id = `node_${idCounter++}_${node.name}`
    nodes.push({ ...node, id, depth })
    if (node.children) {
      node.children.forEach(child => flatten(child, depth + 1))
    }
  }

  if (props.data) flatten(props.data)
  return nodes
})

// 过滤节点
const filteredNodes = computed(() => {
  let nodes = flatNodes.value

  if (!showExternal.value) {
    nodes = nodes.filter(n => !n.isNoMatch)
  }

  if (searchText.value) {
    const keyword = searchText.value.toLowerCase()
    nodes = nodes.filter(n =>
      n.name.toLowerCase().includes(keyword) ||
      (n.className && n.className.toLowerCase().includes(keyword))
    )
  }

  return nodes
})

// 根节点
const rootNodes = computed(() => {
  if (!props.data) return []
  return [{ ...props.data, id: 'root', depth: 0 }]
})

// 统计
const projectCount = computed(() => flatNodes.value.filter(n => !n.isNoMatch).length)
const externalCount = computed(() => flatNodes.value.filter(n => n.isNoMatch).length)
const maxDepth = computed(() => Math.max(...flatNodes.value.map(n => n.depth), 0))

// 流程图 - 深度范围
const flowDepthRange = computed(() => {
  const range: number[] = []
  for (let i = 0; i <= maxDepth.value; i++) {
    range.push(i)
  }
  return range
})

// 获取指定深度的节点
const getNodesByDepth = (depth: number) => {
  return filteredNodes.value.filter(n => n.depth === depth)
}

// 工具函数
const isMatch = (node: ChainNode) => {
  if (!searchText.value) return false
  return node.name.toLowerCase().includes(searchText.value.toLowerCase())
}

const highlightText = (text: string) => {
  if (!searchText.value) return text
  return text.replace(new RegExp(`(${searchText.value})`, 'gi'), '<mark>$1</mark>')
}

const shortClass = (className: string) => {
  const parts = className.split('.')
  return parts.length > 2 ? '...' + parts.slice(-2).join('.') : className
}

const handleSelect = (node: ChainNode) => {
  selectedNode.value = node
  showDetail.value = true
  emit('node-click', node, new MouseEvent('click'))
}

// 右键菜单处理
const handleContextMenu = (payload: { event: MouseEvent; node: ChainNode } | MouseEvent, node?: ChainNode) => {
  // 兼容两种调用方式
  let event: MouseEvent
  let targetNode: ChainNode

  if ('event' in payload && 'node' in payload) {
    event = payload.event
    targetNode = payload.node
  } else {
    event = payload as MouseEvent
    targetNode = node!
  }

  event.preventDefault()
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    node: targetNode
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

// 构建方法签名
const buildMethodSignature = (node: ChainNode): string => {
  if (!node) return ''
  const className = node.className || ''
  const methodName = node.name || ''
  return className ? `${className}.${methodName}` : methodName
}

// 向上查询
const queryUpstream = async () => {
  hideContextMenu()
  const node = contextMenu.value.node
  if (!node) return

  const method = buildMethodSignature(node)
  await doRecursiveQuery('upstream', method)
}

// 向下查询
const queryDownstream = async () => {
  hideContextMenu()
  const node = contextMenu.value.node
  if (!node) return

  const method = buildMethodSignature(node)
  await doRecursiveQuery('downstream', method)
}

// 跳转到方法引用分析页面 - 向上
const goToUpstream = () => {
  hideContextMenu()
  const node = contextMenu.value.node
  if (!node) return
  emit('navigate-method-ref', 'up', node.className || '', node.name || '')
}

// 跳转到方法引用分析页面 - 向下
const goToDownstream = () => {
  hideContextMenu()
  const node = contextMenu.value.node
  if (!node) return
  emit('navigate-method-ref', 'down', node.className || '', node.name || '')
}

// 查看详情
const viewDetails = () => {
  hideContextMenu()
  if (contextMenu.value.node) {
    handleSelect(contextMenu.value.node)
  }
}

// 列表视图中的快速查询
const queryUpstreamForNode = (node: ChainNode) => {
  const method = buildMethodSignature(node)
  doRecursiveQuery('upstream', method)
}

const queryDownstreamForNode = (node: ChainNode) => {
  const method = buildMethodSignature(node)
  doRecursiveQuery('downstream', method)
}

// 从详情弹窗向上查询
const queryUpstreamFromDialog = async () => {
  if (!selectedNode.value) return
  const method = buildMethodSignature(selectedNode.value)
  showDetail.value = false
  await doRecursiveQuery('upstream', method)
}

// 从详情弹窗向下查询
const queryDownstreamFromDialog = async () => {
  if (!selectedNode.value) return
  const method = buildMethodSignature(selectedNode.value)
  showDetail.value = false
  await doRecursiveQuery('downstream', method)
}

// 执行递归查询
const doRecursiveQuery = async (type: 'upstream' | 'downstream', method: string) => {
  loadingRecursive.value = true
  showRecursiveResult.value = true
  isUpstreamQuery.value = type === 'upstream'
  recursiveTitle.value = type === 'upstream' ? '向上查询 - 调用接口列表' : '向下调用链查询结果'
  recursiveData.value = []

  try {
    const response = await axios.get(`/api/callchain/${type}`, {
      params: {
        method: method,
        maxDepth: 10
      }
    })

    if (response.data && response.data.data) {
      recursiveData.value = response.data.data
      if (response.data.data.length === 0) {
        ElMessage.info('未找到相关数据')
      }
    }
  } catch (error: any) {
    console.error('Recursive query error:', error)
    ElMessage.error(`查询失败: ${error.response?.data?.message || error.message}`)
  } finally {
    loadingRecursive.value = false
  }

  emit('recursive-query', type, method, selectedNode.value?.className || '')
}

// 点击其他地方隐藏右键菜单
const handleClickOutside = () => {
  hideContextMenu()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.chain-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 12px;
  background: #fafafa;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 24px;
  padding: 12px 20px;
  background: #f0f5ff;
  border-bottom: 1px solid #d6e4ff;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stat-item.project .stat-value { color: #18a058; }
.stat-item.external .stat-value { color: #f0a020; }
.stat-item.depth .stat-value { color: #2080f0; }

.stat-label {
  font-size: 13px;
  color: #666;
}

/* 内容区域 */
.content-area {
  flex: 1;
  overflow: auto;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

/* 树形视图 */
.tree-view {
  padding: 16px;
}

/* 流程图视图 */
.flow-view {
  padding: 20px;
  background: linear-gradient(180deg, #f8fbff 0%, #fff 100%);
}

.flow-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.flow-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.level-header {
  margin-bottom: 12px;
}

.level-badge {
  display: inline-block;
  padding: 4px 16px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.level-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  padding: 0 20px;
}

.flow-node {
  position: relative;
  padding: 14px 18px;
  min-width: 180px;
  max-width: 280px;
  background: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.flow-node:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
  transform: translateY(-2px);
}

.flow-node.is-external {
  background: linear-gradient(135deg, #fffbe6 0%, #fff9e0 100%);
  border-color: #f5d44d;
}

.flow-node.is-match {
  border-color: #18a058;
  background: linear-gradient(135deg, #f0fff4 0%, #e8ffec 100%);
}

.flow-node.is-root {
  border-color: #409eff;
  background: linear-gradient(135deg, #e8f4ff 0%, #d6e9ff 100%);
}

.node-icon {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 12px;
  background: #409eff;
  color: #fff;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.node-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-top: 4px;
  word-break: break-all;
}

.node-class {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.node-tag {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 8px;
  background: #f0a020;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
}

.level-arrow {
  margin: 8px 0;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

/* 列表视图 */
.list-view {
  padding: 0;
}

.list-table {
  width: 100%;
  border-collapse: collapse;
}

.list-header {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-bottom: 2px solid #e4e7ed;
  font-weight: 600;
  color: #606266;
  position: sticky;
  top: 0;
  z-index: 10;
}

.list-header > div {
  padding: 12px 16px;
  text-align: left;
}

.list-body {
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.list-row {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  transition: background 0.2s;
}

.list-row:hover {
  background: #f5f7fa;
}

.list-row.is-external {
  background: #fffbf0;
}

.list-row.is-external:hover {
  background: #fff7e6;
}

.list-row.is-match {
  background: #f0fff4;
}

.list-row.depth-0 {
  background: #e8f4ff;
}

.list-row.depth-0:hover {
  background: #d6e9ff;
}

.col-depth {
  width: 80px;
  padding: 10px 16px;
  text-align: center;
}

.depth-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.col-method {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 10px 16px;
  min-width: 0;
}

.method-indent {
  flex-shrink: 0;
  border-left: 2px solid #d9ecff;
  height: 100%;
  margin-right: 8px;
}

.method-name {
  cursor: pointer;
  color: #303133;
  font-weight: 500;
}

.method-name:hover {
  color: #409eff;
}

.method-name :deep(mark) {
  background: #ffe066;
  padding: 0 2px;
  border-radius: 2px;
}

.col-class {
  width: 200px;
  padding: 10px 16px;
  color: #909399;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-type {
  width: 100px;
  padding: 10px 16px;
  text-align: center;
}

.col-action {
  width: 160px;
  padding: 10px 16px;
  text-align: right;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 180px;
  z-index: 9999;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  color: #303133;
}

.menu-item:hover {
  background: #f5f7fa;
}

.menu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.menu-divider {
  height: 1px;
  background: #eee;
  margin: 6px 0;
}

/* 详情弹窗 */
.detail-content {
  padding: 0 8px;
}

.detail-row {
  margin-bottom: 20px;
}

.detail-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.detail-value {
  font-size: 14px;
  color: #303133;
}

.detail-value.name {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.detail-code {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
}

.detail-code.body {
  max-height: 300px;
}

/* 递归查询结果 */
.recursive-content {
  max-height: 500px;
  overflow-y: auto;
}

.no-result {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.recursive-list {
  padding: 8px;
}

.recursive-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #409eff;
}

.recursive-depth {
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.recursive-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.recursive-package {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

/* URI 列表样式 */
.uri-list {
  padding: 8px;
}

.uri-count {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
  padding-left: 8px;
}

.uri-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 3px solid #409eff;
  transition: all 0.2s;
}

.uri-item:hover {
  background: #e8f4ff;
  border-left-color: #66b1ff;
}

.uri-index {
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
}

.uri-text {
  font-size: 14px;
  font-family: monospace;
  color: #303133;
  word-break: break-all;
}
</style>