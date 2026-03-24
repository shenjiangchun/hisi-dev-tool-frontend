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
        <div class="method-input-area">
          <el-tag
            v-for="(method, index) in entryMethods"
            :key="index"
            closable
            @close="removeMethod(index)"
            class="method-tag"
          >
            {{ method }}
          </el-tag>
          <el-input
            v-model="methodInput"
            placeholder="输入方法名（如：com.example.Service.method）"
            @keyup.enter="addMethod"
            style="width: 400px;"
            size="small"
          >
            <template #append>
              <el-button @click="addMethod" :disabled="!methodInput">添加</el-button>
            </template>
          </el-input>
        </div>
        <el-radio-group v-model="analysisDirection" size="small">
          <el-radio-button label="upstream">向上（调用方）</el-radio-button>
          <el-radio-button label="downstream">向下（被调用方）</el-radio-button>
        </el-radio-group>
        <el-button
          type="primary"
          @click="loadDependencyGraph"
          :loading="loading"
          :disabled="entryMethods.length === 0"
        >
          生成依赖图
        </el-button>
        <el-button
          type="success"
          @click="handleAIAnalysis"
          :loading="analysisLoading"
          :disabled="!chainData"
        >
          <el-icon><ChatDotRound /></el-icon>
          AI 影响分析
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import { callChainApi } from '@/api/callChain'
import { claudeApi } from '@/api/claude'
import { useAppStore } from '@/stores/app'
import { usePromptStore } from '@/stores/promptStore'
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
const router = useRouter()
const appStore = useAppStore()
const promptStore = usePromptStore()

const projectName = computed(() => appStore.selectedProject || '')
const selection = ref<Selection | null>(null)
const loading = ref(false)
const analysisLoading = ref(false)
const chainData = ref<ChainNode | null>(null)

// Multi-method input
const methodInput = ref('')
const entryMethods = ref<string[]>([])
const analysisDirection = ref<'upstream' | 'downstream'>('downstream')

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNode = ref<ChainNode | null>(null)

const handleSelectionChange = (value: Selection | null) => {
  selection.value = value
  chainData.value = null
}

// Add method to entry list
const addMethod = () => {
  const method = methodInput.value.trim()
  if (method && !entryMethods.value.includes(method)) {
    entryMethods.value.push(method)
    methodInput.value = ''
  }
}

// Remove method from entry list
const removeMethod = (index: number) => {
  entryMethods.value.splice(index, 1)
}

// Load dependency graph for multiple methods
const loadDependencyGraph = async () => {
  if (entryMethods.value.length === 0) return

  loading.value = true
  try {
    const res = await callChainApi.getMethodGraph({
      methods: entryMethods.value,
      direction: analysisDirection.value,
      maxDepth: 5,
      projectDir: appStore.projectDir
    })
    chainData.value = buildGraphData(res.data)
    ElMessage.success('依赖图生成成功')
  } catch (error) {
    ElMessage.error('生成依赖图失败')
  } finally {
    loading.value = false
  }
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

const buildGraphData = (data: any): ChainNode => {
  const nodes = data.nodes || []

  // Build root from entry methods
  const root: ChainNode = {
    name: '入口方法',
    className: '',
    children: entryMethods.value.map(method => ({
      name: method.split('.').pop() || method,
      className: method.substring(0, method.lastIndexOf('.')),
      methodSignature: method,
      children: []
    }))
  }

  // Add dependency nodes
  const nodeMap = new Map<string, ChainNode>()
  nodes.forEach((node: any) => {
    if (node.method && !node.isEntry) {
      const chainNode: ChainNode = {
        name: node.method.split('.').pop() || node.method,
        className: node.method.substring(0, node.method.lastIndexOf('.')),
        methodSignature: node.method
      }
      nodeMap.set(node.method, chainNode)
    }
  })

  // Attach children based on depth
  nodes.forEach((node: any) => {
    if (node.calledMethod && nodeMap.has(node.method)) {
      const parent = nodeMap.get(node.calledMethod)
      const child = nodeMap.get(node.method)
      if (parent && child) {
        if (!parent.children) parent.children = []
        parent.children.push(child)
      }
    }
  })

  return root
}

// Handle AI analysis
const handleAIAnalysis = async () => {
  if (!chainData.value) return

  analysisLoading.value = true
  try {
    const methodList = entryMethods.value.join(', ')
    const direction = analysisDirection.value === 'upstream' ? '向上（查找调用方）' : '向下（查找被调用方）'

    await promptStore.loadTemplates()
    const prompt = promptStore.render('impact-analysis', {
      changedFile: '方法依赖分析',
      changedMethod: methodList,
      changeType: 'DEPENDENCY_ANALYSIS',
      projectName: projectName.value
    }) + `\n\n分析方向: ${direction}\n入口方法数量: ${entryMethods.value.length}`

    const sessionId = await claudeApi.universalChat(
      {
        prompt,
        scene: 'impact-analysis',
        metadata: {
          projectName: projectName.value,
          methods: entryMethods.value,
          direction: analysisDirection.value
        }
      },
      {
        onOutput: () => {},
        onDone: () => {},
        onError: (error) => {
          ElMessage.error(`分析失败: ${error}`)
        }
      }
    )

    router.push({ name: 'ClaudeSession', query: { sessionId } })
    ElMessage.success('已创建影响分析会话')
  } catch (error) {
    ElMessage.error('创建分析会话失败')
  } finally {
    analysisLoading.value = false
  }
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
    case 'addToEntry':
      if (node.methodSignature && !entryMethods.value.includes(node.methodSignature)) {
        entryMethods.value.push(node.methodSignature)
        ElMessage.success('已添加到入口方法列表')
      }
      break
  }
}

// 从 URL 参数初始化
onMounted(() => {
  const { className, methodName, direction, methods } = route.query

  // Support multi-method input from URL
  if (methods) {
    const methodList = (methods as string).split(',').filter(m => m.trim())
    entryMethods.value = methodList
    if (direction === 'up') {
      analysisDirection.value = 'upstream'
    }
    if (methodList.length > 0) {
      loadDependencyGraph()
    }
  } else if (className && methodName) {
    selection.value = {
      className: className as string,
      methodName: methodName as string
    }
    entryMethods.value = [`${className}.${methodName}`]
    if (direction === 'up') {
      analysisDirection.value = 'upstream'
      loadUpstream()
    } else if (direction === 'down') {
      analysisDirection.value = 'downstream'
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
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.method-input-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.method-tag {
  margin-right: 4px;
}

.method-reference-graph {
  height: calc(100vh - 200px);
}
</style>