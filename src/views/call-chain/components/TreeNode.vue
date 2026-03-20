<template>
  <div class="tree-node" v-if="shouldShow">
    <div
      class="tree-row"
      :class="{ 'is-external': node.isNoMatch }"
      @click="handleSelect"
      @contextmenu.prevent="handleContextMenu"
    >
      <div
        class="tree-toggle"
        :class="{ 'has-children': hasVisibleChildren }"
        @click.stop="toggleExpand"
      >
        {{ hasVisibleChildren ? (expanded ? '▼' : '▶') : '•' }}
      </div>
      <div class="tree-depth">{{ level }}</div>
      <div class="tree-info">
        <div class="tree-name" v-html="highlightedName"></div>
        <div class="tree-class" v-if="node.className">{{ node.className }}</div>
      </div>
      <span v-if="node.isNoMatch" class="external-tag">外部</span>
    </div>
    <div v-if="hasVisibleChildren && expanded" class="tree-children">
      <TreeNode
        v-for="(child, index) in visibleChildren"
        :key="index"
        :node="child"
        :level="level + 1"
        :search="search"
        :hide-external="hideExternal"
        @select="$emit('select', $event)"
        @contextmenu="$emit('contextmenu', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ChainNode {
  name: string
  className?: string
  methodSignature?: string
  methodBody?: string
  isNoMatch?: boolean
  children?: ChainNode[]
  id?: string
  depth?: number
}

const props = defineProps<{
  node: ChainNode
  level: number
  search?: string
  hideExternal?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', node: ChainNode): void
  (e: 'contextmenu', payload: { event: MouseEvent; node: ChainNode }): void
}>()

const expanded = ref(props.level < 3)

const shouldShow = computed(() => {
  if (props.hideExternal && props.node.isNoMatch) {
    return false
  }
  return true
})

const visibleChildren = computed(() => {
  if (!props.node.children) return []
  if (props.hideExternal) {
    return props.node.children.filter(c => !c.isNoMatch)
  }
  return props.node.children
})

const hasVisibleChildren = computed(() => visibleChildren.value.length > 0)

const highlightedName = computed(() => {
  if (!props.search) return props.node.name
  return props.node.name.replace(
    new RegExp(`(${props.search})`, 'gi'),
    '<mark>$1</mark>'
  )
})

const toggleExpand = () => {
  expanded.value = !expanded.value
}

const handleSelect = () => {
  emit('select', props.node)
}

const handleContextMenu = (event: MouseEvent) => {
  emit('contextmenu', { event, node: props.node })
}
</script>

<style scoped>
.tree-node {
  margin-bottom: 4px;
}

.tree-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.tree-row:hover {
  background: #e8f4ff;
  border-color: #409eff;
}

.tree-row.is-external {
  background: #fffbe6;
  border-color: #f5d44d;
}

.tree-toggle {
  width: 18px;
  text-align: center;
  font-size: 10px;
  color: #909399;
  cursor: pointer;
  user-select: none;
}

.tree-toggle.has-children {
  color: #409eff;
}

.tree-depth {
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tree-info {
  flex: 1;
  min-width: 0;
}

.tree-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.tree-name :deep(mark) {
  background: #ffe066;
  padding: 0 2px;
  border-radius: 2px;
}

.tree-class {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: #f0a020;
  color: #fff;
  border-radius: 4px;
  flex-shrink: 0;
}

.tree-children {
  margin-left: 28px;
  padding-left: 12px;
  border-left: 2px solid #dcdfe6;
  margin-top: 4px;
}
</style>