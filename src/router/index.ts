import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/project'
  },
  {
    path: '/mcp-guide',
    name: 'McpGuide',
    component: () => import('@/views/mcp/McpGuide.vue'),
    meta: {
      title: 'MCP 使用指南'
    }
  },
  {
    path: '/log-analysis',
    name: 'LogAnalysis',
    component: () => import('@/views/log-analysis/LogQuery.vue'),
    meta: {
      title: '日志分析'
    }
  },
  {
    path: '/log-analysis/report/:id',
    name: 'ReportDetail',
    component: () => import('@/views/log-analysis/ReportDetail.vue'),
    meta: {
      title: '报告详情'
    }
  },
  {
    path: '/call-chain',
    redirect: '/call-chain/uri-chain'
  },
  {
    path: '/call-chain/uri-chain',
    name: 'UriCallChain',
    component: () => import('@/views/call-chain/CallChainGraph.vue'),
    meta: {
      title: '接口调用链查询'
    }
  },
  {
    path: '/call-chain/method-reference',
    name: 'MethodReference',
    component: () => import('@/views/call-chain/MethodReferenceGraph.vue'),
    meta: {
      title: '方法引用关系分析'
    }
  },
  {
    path: '/project',
    name: 'Project',
    component: () => import('@/views/project/ProjectList.vue'),
    meta: {
      title: '项目管理'
    }
  },
  {
    path: '/ops',
    name: 'Ops',
    component: () => import('@/views/ops/HealthCheck.vue'),
    meta: {
      title: '运维监控'
    }
  },
  {
    path: '/ops/impact',
    name: 'ImpactAnalysis',
    component: () => import('@/views/ops/ImpactAnalysis.vue'),
    meta: {
      title: '影响分析'
    }
  },
  {
    path: '/ops/docs',
    name: 'ApiDocs',
    component: () => import('@/views/ops/ApiDocs.vue'),
    meta: {
      title: '接口文档'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(async (to, _from, next) => {
  // Set document title
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - HiSi Dev Tool`
  }

  // Load config on first navigation
  const appStore = useAppStore()
  if (!appStore.projectDir && !appStore.configLoading) {
    await appStore.loadProjectDir()
    // Check if there was an error loading config
    if (appStore.configError) {
      console.error('Failed to load project configuration:', appStore.configError)
      // Still proceed - user can try to configure manually
    }
  }

  // Check menu availability
  const menuAvailability = appStore.availableMenus

  // Block access to restricted pages
  if (to.path.startsWith('/call-chain') && !menuAvailability['call-chain']) {
    ElMessage.warning('请先配置项目目录并选择项目')
    return next('/project')
  }

  if (to.path.startsWith('/log-analysis') && !menuAvailability['log-analysis']) {
    ElMessage.warning('请先配置项目目录并选择项目')
    return next('/project')
  }

  // Redirect ops to project (ops is permanently disabled)
  if (to.path.startsWith('/ops')) {
    return next('/project')
  }

  // MCP Guide is always accessible
  if (to.path === '/mcp-guide') {
    return next()
  }

  next()
})

export default router