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
          查询
        </el-button>
        <el-button
          v-if="analysisDirection === 'downstream' && chainData"
          type="success"
          @click="handleAIAnalysis"
          :loading="analysisLoading"
        >
          <el-icon><ChatDotRound /></el-icon>
          AI 影响分析
        </el-button>
      </div>

      <!-- 向上查询：展示接口 URI 列表 -->
      <div v-if="analysisDirection === 'upstream' && upstreamUris.length > 0" class="uri-list-section">
        <div class="section-header">
          <el-icon><Link /></el-icon>
          <span>关联接口 ({{ upstreamUris.length }})</span>
        </div>
        <el-table :data="upstreamUris" stripe style="width: 100%">
          <el-table-column prop="uri" label="接口 URI" min-width="300">
            <template #default="{ row }">
              <el-link type="primary" @click="navigateToCallChain(row.uri)">
                {{ row.uri }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" @click="navigateToCallChain(row.uri)">
                查看调用链
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 向上查询：无结果提示 -->
      <el-empty v-if="analysisDirection === 'upstream' && upstreamUris.length === 0 && !loading && hasQueried"
        description="未找到关联的接口 URI" />

      <!-- 向下查询：展示依赖图 -->
      <ChainChart
        v-if="analysisDirection === 'downstream'"
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
import { ChatDotRound, Link } from '@element-plus/icons-vue'
import { callChainApi } from '@/api/callChain'
import { claudeApi } from '@/api/claude'
import { useAppStore } from '@/stores/app'
import { usePromptStore } from '@/stores/promptStore'
import ChainChart from './components/ChainChart.vue'
import ContextMenu from './components/ContextMenu.vue'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  children?: ChainNode[]
}

interface UpstreamUri {
  uri: string
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
const upstreamUris = ref<UpstreamUri[]>([])
const hasQueried = ref(false)

// Multi-method input
const methodInput = ref('')
const entryMethods = ref<string[]>([])
const analysisDirection = ref<'upstream' | 'downstream'>('downstream')

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNode = ref<ChainNode | null>(null)

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
  hasQueried.value = true
  upstreamUris.value = []
  chainData.value = null

  try {
    // 将多个方法用逗号连接
    const methodsParam = entryMethods.value.join(',')

    if (analysisDirection.value === 'upstream') {
      // 向上查询：获取关联的接口 URI 列表
      const res = await callChainApi.getUpstream({
        method: methodsParam,
        maxDepth: 5,
        projectDir: appStore.projectDir
      })
      // 后端返回的数据格式可能是 [{uri: xxx}, {uri: xxx}] 或 [{rootUri: xxx}]
      upstreamUris.value = (res.data || []).map((item: any) => ({
        uri: item.uri || item.rootUri || item
      })).filter((item: UpstreamUri) => item.uri)

      if (upstreamUris.value.length > 0) {
        ElMessage.success(`找到 ${upstreamUris.value.length} 个关联接口`)
      } else {
        ElMessage.info('未找到关联的接口 URI')
      }
    } else {
      // 向下查询：获取依赖图
      const res = await callChainApi.getDownstream({
        method: methodsParam,
        maxDepth: 5,
        projectDir: appStore.projectDir
      })
      chainData.value = buildTreeData(res.data, 'downstream')
      ElMessage.success('依赖图生成成功')
    }
  } catch (error) {
    ElMessage.error('查询失败')
  } finally {
    loading.value = false
  }
}

// 导航到调用链页面
const navigateToCallChain = (uri: string) => {
  router.push({
    path: '/call-chain/chain',
    query: { uri, project: projectName.value }
  })
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
    upstreamUris.value = (res.data || []).map((item: any) => ({
      uri: item.uri || item.rootUri || item
    })).filter((item: UpstreamUri) => item.uri)
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

const buildTreeData = (data: any[], direction: 'upstream' | 'downstream'): ChainNode => {
  // 构建树形数据结构 - 支持多入口方法
  const root: ChainNode = {
    name: '入口方法',
    className: '',
    children: entryMethods.value.map(method => {
      const lastDot = method.lastIndexOf('.')
      const methodName = lastDot > 0 ? method.substring(lastDot + 1) : method
      const className = lastDot > 0 ? method.substring(0, lastDot) : ''
      return {
        name: methodName,
        className: className,
        methodSignature: method,
        children: buildChildrenNodes(method, data, direction)
      }
    })
  }

  return root
}

// 递归构建子节点
const buildChildrenNodes = (parentMethod: string, data: any[], direction: 'upstream' | 'downstream'): ChainNode[] => {
  if (!data || data.length === 0) return []

  const children: ChainNode[] = []
  const processedMethods = new Set<string>()

  data.forEach(item => {
    const targetMethod = direction === 'upstream' ? item.calledMethod : item.callingMethod
    const childMethod = item.method

    // 匹配父方法
    if (targetMethod && childMethod && matchesMethod(targetMethod, parentMethod)) {
      if (!processedMethods.has(childMethod)) {
        processedMethods.add(childMethod)
        const lastDot = childMethod.lastIndexOf('.')
        children.push({
          name: lastDot > 0 ? childMethod.substring(lastDot + 1) : childMethod,
          className: lastDot > 0 ? childMethod.substring(0, lastDot) : '',
          methodSignature: childMethod,
          children: buildChildrenNodes(childMethod, data, direction)
        })
      }
    }
  })

  return children
}

// 检查方法名是否匹配（支持模糊匹配）
const matchesMethod = (targetMethod: string, searchMethod: string): boolean => {
  if (targetMethod === searchMethod) return true
  // 处理带参数签名的情况
  if (targetMethod.startsWith(searchMethod + ':')) return true
  // 处理搜索方法不带完整包名的情况
  if (targetMethod.endsWith('.' + searchMethod)) return true
  return false
}

// Handle AI analysis
const handleAIAnalysis = async () => {
  if (!chainData.value) return

  analysisLoading.value = true
  try {
    const methodList = entryMethods.value.join(', ')
    const direction = '向下（查找被调用方）'

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
        analysisDirection.value = 'upstream'
        loadUpstream()
      } else {
        analysisDirection.value = 'downstream'
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

.uri-list-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.method-reference-graph {
  height: calc(100vh - 200px);
}
</style>
