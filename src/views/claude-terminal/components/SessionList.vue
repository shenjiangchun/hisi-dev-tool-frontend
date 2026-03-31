<template>
  <div class="session-list-panel" :class="{ collapsed: collapsed }">
    <div class="panel-header">
      <span v-if="!collapsed">会话列表</span>
      <el-button text @click="collapsed = !collapsed">
        <el-icon><component :is="collapsed ? 'DArrowRight' : 'DArrowLeft'" /></el-icon>
      </el-button>
    </div>

    <template v-if="!collapsed">
      <div class="session-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索会话"
          prefix-icon="Search"
          clearable
          size="small"
        />
        <el-button
          type="primary"
          size="small"
          style="margin-top: 8px; width: 100%;"
          @click="handleNewSession"
        >
          <el-icon><Plus /></el-icon>
          新建会话
        </el-button>
      </div>

      <div class="session-groups">
        <div class="session-group">
          <div class="group-header" @click="toggleGroup('active')">
            <el-icon><FolderOpened v-if="expandedGroups.active" /><Folder v-else /></el-icon>
            <span>进行中 ({{ workspaceStore.activeSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.active" class="group-items">
            <div
              v-for="session in filteredActiveSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: workspaceStore.currentSessionId === session.id }"
              @click="selectSession(session.id)"
            >
              <div class="session-title">{{ session.title || '新会话' }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
          </div>
        </div>

        <div class="session-group">
          <div class="group-header" @click="toggleGroup('archived')">
            <el-icon><FolderOpened v-if="expandedGroups.archived" /><Folder v-else /></el-icon>
            <span>已归档 ({{ workspaceStore.archivedSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.archived" class="group-items">
            <div
              v-for="session in filteredArchivedSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: workspaceStore.currentSessionId === session.id }"
              @click="selectSession(session.id)"
            >
              <div class="session-title">{{ session.title || '新会话' }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { FolderOpened, Folder, Plus, DArrowRight, DArrowLeft } from '@element-plus/icons-vue'

const emit = defineEmits<{
  newSession: []
  selectSession: [sessionId: string]
}>()

const workspaceStore = useWorkspaceStore()

const collapsed = ref(false)
const searchKeyword = ref('')
const expandedGroups = ref({ active: true, archived: false })

const filteredActiveSessions = computed(() => {
  if (!searchKeyword.value) return workspaceStore.activeSessions
  return workspaceStore.activeSessions.filter(s =>
    s.title?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

const filteredArchivedSessions = computed(() => {
  if (!searchKeyword.value) return workspaceStore.archivedSessions
  return workspaceStore.archivedSessions.filter(s =>
    s.title?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

function toggleGroup(group: 'active' | 'archived') {
  expandedGroups.value[group] = !expandedGroups.value[group]
}

function handleNewSession() {
  emit('newSession')
}

function selectSession(sessionId: string) {
  emit('selectSession', sessionId)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.session-list-panel {
  width: 220px;
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.session-list-panel.collapsed {
  width: 40px;
}

.panel-header {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.session-actions {
  padding: 12px;
}

.session-groups {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-group {
  margin-bottom: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #606266;
}

.group-header:hover {
  background-color: #e9ecf0;
}

.group-items {
  padding-left: 8px;
}

.session-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
}

.session-item:hover {
  background-color: #e9ecf0;
}

.session-item.active {
  background-color: #409eff;
  color: white;
}

.session-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  font-size: 12px;
  color: #909399;
}

.session-item.active .session-meta {
  color: rgba(255, 255, 255, 0.8);
}
</style>