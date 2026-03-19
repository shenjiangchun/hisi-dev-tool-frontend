<template>
  <div class="method-reference-graph">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>方法引用关系分析</span>
          <el-tag type="info" v-if="projectName">{{ projectName }}</el-tag>
        </div>
      </template>

      <div class="toolbar">
        <ClassMethodSelector
          :project="projectName"
          @change="handleSelectionChange"
          style="width: 400px;"
        />
        <el-button
          type="primary"
          @click="loadUpstream"
          :loading="loading"
          :disabled="!selection"
        >
          向上查询
        </el-button>
        <el-button
          type="success"
          @click="loadDownstream"
          :loading="loading"
          :disabled="!selection"
        >
          向下查询
        </el-button>
      </div>

      <ChainChart
        :data="chainData"
        :loading="loading"
        @node-contextmenu="handleContextMenu"
      />
    </el-card>

    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :node="contextMenuNode"
      @close="closeContextMenu"
      @action="handleMenuAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { callChainApi } from '@/api/callChain'
import { useAppStore } from '@/stores/app'
import ClassMethodSelector from './components/ClassMethodSelector.vue'
import ChainChart from './components/ChainChart.vue'
import ContextMenu from './components/ContextMenu.vue'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  children?: ChainNode[]
}

interface Selection {
  className: string
  methodName: string
}

const route = useRoute()
const appStore = useAppStore()

const projectName = computed(() => appStore.selectedProject || '')
const selection = ref<Selection | null>(null)
const loading = ref(false)
const chainData = ref<ChainNode | null>(null)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNode = ref<ChainNode | null>(null)

const handleSelectionChange = (value: Selection | null) => {
  selection.value = value
  chainData.value = null
}

const loadUpstream = async () => {
  if (!selection.value) return

  loading.value = true
  try {
    const res = await callChainApi.getCallers({
      method: `${selection.value.className}.${selection.value.methodName}`,
      maxDepth: 5,
      project: projectName.value
    })
    chainData.value = buildTreeData(res.data, 'upstream')
  } catch (error) {
    ElMessage.error('加载上游调用链失败')
  } finally {
    loading.value = false
  }
}

const loadDownstream = async () => {
  if (!selection.value) return

  loading.value = true
  try {
    const res = await callChainApi.getCallees({
      method: `${selection.value.className}.${selection.value.methodName}`,
      maxDepth: 5,
      project: projectName.value
    })
    chainData.value = buildTreeData(res.data, 'downstream')
  } catch (error) {
    ElMessage.error('加载下游调用链失败')
  } finally {
    loading.value = false
  }
}

const buildTreeData = (data: any[], _direction: 'upstream' | 'downstream'): ChainNode => {
  // 构建树形数据结构
  const root: ChainNode = {
    name: selection.value!.methodName,
    className: selection.value!.className,
    children: []
  }

  if (data && data.length > 0) {
    root.children = data.map(item => ({
      name: item.methodName || item.callee_method || item.caller_method || '',
      className: item.className || item.callee_class || item.caller_class || '',
      methodSignature: item.signature || ''
    }))
  }

  return root
}

const handleContextMenu = (node: ChainNode, event: MouseEvent) => {
  event.preventDefault()
  contextMenuNode.value = node
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

const closeContextMenu = () => {
  contextMenuVisible.value = false
  contextMenuNode.value = null
}

const handleMenuAction = (action: string, node: ChainNode) => {
  switch (action) {
    case 'upstream':
    case 'downstream':
      selection.value = {
        className: node.className || '',
        methodName: node.name
      }
      if (action === 'upstream') {
        loadUpstream()
      } else {
        loadDownstream()
      }
      break
    case 'copy':
      navigator.clipboard.writeText(node.methodSignature || node.name)
      ElMessage.success('已复制到剪贴板')
      break
  }
}

// 从 URL 参数初始化
onMounted(() => {
  const { className, methodName, direction } = route.query
  if (className && methodName) {
    selection.value = {
      className: className as string,
      methodName: methodName as string
    }
    if (direction === 'up') {
      loadUpstream()
    } else if (direction === 'down') {
      loadDownstream()
    }
  }
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.method-reference-graph {
  height: calc(100vh - 200px);
}
</style>