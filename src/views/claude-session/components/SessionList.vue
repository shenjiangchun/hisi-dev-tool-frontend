<template>
  <div class="session-list-panel" :class="{ collapsed: collapsed }">
    <!-- Panel Header -->
    <div class="panel-header">
      <span v-if="!collapsed" class="panel-title">会话列表</span>
      <el-button text @click="toggleCollapse">
        <el-icon>
          <DArrowRight v-if="collapsed" />
          <DArrowLeft v-else />
        </el-icon>
      </el-button>
    </div>

    <template v-if="!collapsed">
      <!-- Search and Create Actions -->
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
          class="create-btn"
          @click="handleCreate"
        >
          <el-icon><Plus /></el-icon>
          新建会话
        </el-button>
      </div>

      <!-- Session Groups -->
      <div class="session-groups">
        <!-- Active Sessions Group -->
        <div class="session-group">
          <div class="group-header" @click="toggleGroup('active')">
            <el-icon>
              <FolderOpened v-if="expandedGroups.active" />
              <Folder v-else />
            </el-icon>
            <span>进行中 ({{ filteredActiveSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.active" class="group-items">
            <div
              v-for="session in filteredActiveSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: currentSessionId === session.id }"
              @click="handleSelect(session.id)"
            >
              <div class="session-title">{{ getSessionTitle(session) }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
            <div v-if="filteredActiveSessions.length === 0" class="empty-group">
              暂无进行中的会话
            </div>
          </div>
        </div>

        <!-- Archived Sessions Group -->
        <div class="session-group">
          <div class="group-header" @click="toggleGroup('archived')">
            <el-icon>
              <FolderOpened v-if="expandedGroups.archived" />
              <Folder v-else />
            </el-icon>
            <span>已归档 ({{ filteredArchivedSessions.length }})</span>
          </div>
          <div v-show="expandedGroups.archived" class="group-items">
            <div
              v-for="session in filteredArchivedSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: currentSessionId === session.id }"
              @click="handleSelect(session.id)"
            >
              <div class="session-title">{{ getSessionTitle(session) }}</div>
              <div class="session-meta">{{ formatDate(session.createdAt) }}</div>
            </div>
            <div v-if="filteredArchivedSessions.length === 0" class="empty-group">
              暂无已归档的会话
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Folder, FolderOpened, Plus, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { SCENE_NAMES } from '@/types/session'
import type { Session } from '@/types/session'

// Props
interface Props {
  currentSessionId: string | null
  activeSessions: Session[]
  archivedSessions: Session[]
}

const props = withDefaults(defineProps<Props>(), {
  currentSessionId: null,
  activeSessions: () => [],
  archivedSessions: () => []
})

// Emits
const emit = defineEmits<{
  create: []
  select: [sessionId: string]
}>()

// Local state
const collapsed = ref(false)
const searchKeyword = ref('')
const expandedGroups = ref({
  active: true,
  archived: false
})

// Computed: filtered sessions based on search keyword
const filteredActiveSessions = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  if (!keyword) return props.activeSessions
  return props.activeSessions.filter(s =>
    (s.title || '').toLowerCase().includes(keyword) ||
    s.scene.toLowerCase().includes(keyword)
  )
})

const filteredArchivedSessions = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  if (!keyword) return props.archivedSessions
  return props.archivedSessions.filter(s =>
    (s.title || '').toLowerCase().includes(keyword) ||
    s.scene.toLowerCase().includes(keyword)
  )
})

// Methods
function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function toggleGroup(group: 'active' | 'archived') {
  expandedGroups.value[group] = !expandedGroups.value[group]
}

function handleCreate() {
  emit('create')
}

function handleSelect(sessionId: string) {
  emit('select', sessionId)
}

function getSessionTitle(session: Session): string {
  return session.title || SCENE_NAMES[session.scene]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}
</script>

<style scoped>
.session-list-panel {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.session-list-panel.collapsed {
  width: 50px;
}

.panel-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
  min-height: 56px;
}

.panel-title {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
}

.session-actions {
  padding: 12px 16px;
}

.create-btn {
  margin-top: 8px;
  width: 100%;
}

.session-groups {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.session-group {
  margin-bottom: 8px;
}

.group-header {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #606266;
  transition: background-color 0.2s;
}

.group-header:hover {
  background: #f5f7fa;
}

.group-items {
  padding: 0 8px;
}

.session-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.2s;
}

.session-item:hover {
  background: #ecf5ff;
}

.session-item.active {
  background: #409eff;
  color: #fff;
}

.session-item.active .session-meta {
  color: rgba(255, 255, 255, 0.8);
}

.session-title {
  font-size: 14px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  font-size: 12px;
  color: #909399;
}

.empty-group {
  padding: 12px 16px;
  font-size: 13px;
  color: #909399;
  text-align: center;
}
</style>