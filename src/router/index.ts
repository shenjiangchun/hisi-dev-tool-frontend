import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/log-analysis'
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
    name: 'CallChain',
    component: () => import('@/views/call-chain/ProjectList.vue'),
    meta: {
      title: '调用链分析'
    }
  },
  {
    path: '/call-chain/uris',
    name: 'UriList',
    component: () => import('@/views/call-chain/UriList.vue'),
    meta: {
      title: 'URI列表'
    }
  },
  {
    path: '/call-chain/graph',
    name: 'CallChainGraph',
    component: () => import('@/views/call-chain/CallChainGraph.vue'),
    meta: {
      title: '调用链可视化'
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

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - HiSi Dev Tool`
  }
  next()
})

export default router