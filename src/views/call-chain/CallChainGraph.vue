<template>
  <div class="call-chain-graph">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>接口调用链查询</span>
          <el-select
            v-model="selectedProject"
            placeholder="选择项目"
            filterable
            @change="handleProjectChange"
            style="width: 250px;"
          >
            <el-option
              v-for="proj in projects"
              :key="proj"
              :label="proj"
              :value="proj"
            />
          </el-select>
        </div>
      </template>

      <div class="toolbar">
        <UriSelector
          :project="selectedProject"
          v-model="selectedUri"
          @change="handleUriChange"
          style="width: 400px;"
        />
        <el-button type="primary" @click="loadCallChain" :loading="loading" :disabled="!selectedUri || !selectedProject">
          查询
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { callChainApi } from '@/api/callChain'
import type { CallChainRawData } from '@/types/callchain'
import UriSelector from './components/UriSelector.vue'
import ChainChart from './components/ChainChart.vue'
import ContextMenu from './components/ContextMenu.vue'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  methodBody?: string
  children?: ChainNode[]
}

const route = useRoute()
const router = useRouter()

const projects = ref<string[]>([])
const selectedProject = ref(route.query.project as string || '')
const selectedUri = ref(route.query.uri as string || '')
const loading = ref(false)
const chainData = ref<ChainNode | null>(null)

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuNode = ref<ChainNode | null>(null)

const loadProjects = async () => {
  try {
    const res = await callChainApi.getProjects()
    // Handle {code, message, data: [...]} response
    projects.value = res.data || []
    // Auto select first project if only one
    if (projects.value.length === 1 && !selectedProject.value) {
      selectedProject.value = projects.value[0]
    }
  } catch (error) {
    ElMessage.error('加载项目列表失败')
  }
}

const handleProjectChange = () => {
  selectedUri.value = ''
  chainData.value = null
}

const handleUriChange = (uri: string) => {
  selectedUri.value = uri
}

/**
 * 解析方法签名，提取类名和方法名
 * 格式: ClassName.methodName:[参数列表]
 */
const parseMethodSignature = (signature: string): { className: string; methodName: string; fullSignature: string } => {
  const colonIndex = signature.indexOf(':')
  const methodPart = colonIndex > 0 ? signature.substring(0, colonIndex) : signature
  const dotIndex = methodPart.lastIndexOf('.')
  const className = dotIndex > 0 ? methodPart.substring(0, dotIndex) : ''
  const methodName = dotIndex > 0 ? methodPart.substring(dotIndex + 1) : methodPart
  return { className, methodName, fullSignature: signature }
}

/**
 * 将后端返回的数组数据转换为树形结构
 */
const convertToTree = (rawData: CallChainRawData[]): ChainNode | null => {
  if (!rawData || rawData.length === 0) return null

  // 使用 Map 存储所有节点，key 为方法签名
  const nodeMap = new Map<string, ChainNode>()

  // 第一遍：创建所有节点
  rawData.forEach(item => {
    // 解析父方法和子方法
    const parent = parseMethodSignature(item.parentMethod)
    const child = parseMethodSignature(item.childMethod)

    // 创建父节点（如果不存在）
    if (!nodeMap.has(item.parentMethod)) {
      nodeMap.set(item.parentMethod, {
        name: parent.methodName,
        className: parent.className,
        methodSignature: item.parentMethod,
        methodBody: item.methodBody,
        children: []
      })
    }

    // 创建子节点（如果不存在）
    if (!nodeMap.has(item.childMethod)) {
      nodeMap.set(item.childMethod, {
        name: child.methodName,
        className: child.className,
        methodSignature: item.childMethod,
        children: []
      })
    }
  })

  // 第二遍：建立父子关系
  const childMethods = new Set<string>()
  rawData.forEach(item => {
    const parentNode = nodeMap.get(item.parentMethod)
    const childNode = nodeMap.get(item.childMethod)
    if (parentNode && childNode) {
      // 避免重复添加子节点
      if (!parentNode.children?.some(c => c.methodSignature === item.childMethod)) {
        parentNode.children?.push(childNode)
      }
      childMethods.add(item.childMethod)
    }
  })

  // 找到根节点（没有父节点的节点）
  let rootNode: ChainNode | null = null
  for (const [key, node] of nodeMap) {
    if (!childMethods.has(key)) {
      rootNode = node
      break
    }
  }

  // 如果没有找到根节点，使用第一个节点
  if (!rootNode && nodeMap.size > 0) {
    const firstNode = nodeMap.values().next().value
    if (firstNode) {
      rootNode = firstNode
    }
  }

  return rootNode
}

const loadCallChain = async () => {
  if (!selectedUri.value || !selectedProject.value) return

  loading.value = true
  try {
    const res = await callChainApi.getCalls({
      project: selectedProject.value,
      uri: selectedUri.value
    })
    // 后端返回的是数组，需要转换为树形结构
    const rawData = res.data as CallChainRawData[]
    chainData.value = convertToTree(rawData)

    if (!chainData.value) {
      ElMessage.warning('未找到调用链数据')
    }
  } catch (error) {
    ElMessage.error('加载调用链数据失败')
  } finally {
    loading.value = false
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
      router.push({
        path: '/call-chain/method-reference',
        query: {
          className: node.className,
          methodName: node.name,
          direction: action === 'upstream' ? 'up' : 'down'
        }
      })
      break
    case 'copy':
      navigator.clipboard.writeText(node.methodSignature || node.name)
      ElMessage.success('已复制到剪贴板')
      break
    case 'openInMethodRef':
      router.push({
        path: '/call-chain/method-reference',
        query: {
          className: node.className,
          methodName: node.name
        }
      })
      break
  }
}

onMounted(() => {
  loadProjects()
  // 初始加载
  if (selectedUri.value && selectedProject.value) {
    loadCallChain()
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
  margin-bottom: 16px;
}

.call-chain-graph {
  height: calc(100vh - 200px);
}
</style>