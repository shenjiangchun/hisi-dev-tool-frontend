<template>
  <div class="class-method-selector">
    <el-select
      v-model="selectedClass"
      filterable
      remote
      clearable
      placeholder="选择或搜索类名"
      :remote-method="handleClassSearch"
      :loading="classLoading"
      @change="handleClassChange"
      style="width: 100%"
    >
      <el-option
        v-for="item in filteredClasses"
        :key="item.className"
        :label="item.className"
        :value="item.className"
      >
        <span>{{ item.className }}</span>
        <span style="color: #999; font-size: 12px; margin-left: 8px;">
          ({{ item.methodCount }} methods)
        </span>
      </el-option>
    </el-select>

    <el-select
      v-model="selectedMethod"
      filterable
      clearable
      placeholder="选择方法"
      :loading="methodLoading"
      :disabled="!selectedClass"
      @change="handleMethodChange"
      style="width: 100%; margin-top: 8px;"
    >
      <el-option
        v-for="item in methods"
        :key="item.methodName"
        :label="item.methodName"
        :value="item.methodName"
      >
        <div>
          <div>{{ item.methodName }}</div>
          <div style="color: #999; font-size: 12px;">{{ item.signature }}</div>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { callChainApi } from '@/api/callChain'

interface ClassInfo {
  className: string
  methodCount: number
}

interface MethodInfo {
  methodName: string
  signature: string
}

const props = defineProps<{
  project?: string
}>()

const emit = defineEmits<{
  (e: 'change', value: { className: string; methodName: string } | null): void
}>()

const classLoading = ref(false)
const methodLoading = ref(false)
const classes = ref<ClassInfo[]>([])
const methods = ref<MethodInfo[]>([])
const classSearchText = ref('')
const selectedClass = ref('')
const selectedMethod = ref('')

const filteredClasses = computed(() => {
  if (!classSearchText.value) return classes.value
  return classes.value.filter(c =>
    c.className.toLowerCase().includes(classSearchText.value.toLowerCase())
  )
})

const handleClassSearch = (query: string) => {
  classSearchText.value = query
}

const handleClassChange = async (value: string) => {
  selectedMethod.value = ''
  methods.value = []
  emit('change', null)

  if (!value) return

  methodLoading.value = true
  try {
    const res = await callChainApi.getMethods({
      className: value,
      project: props.project
    })
    methods.value = res.data || []
  } catch (error) {
    ElMessage.error('加载方法列表失败')
  } finally {
    methodLoading.value = false
  }
}

const handleMethodChange = (value: string) => {
  if (value && selectedClass.value) {
    emit('change', {
      className: selectedClass.value,
      methodName: value
    })
  } else {
    emit('change', null)
  }
}

const loadClasses = async () => {
  classLoading.value = true
  try {
    const res = await callChainApi.getClasses({ project: props.project })
    classes.value = res.data || []
  } catch (error) {
    ElMessage.error('加载类列表失败')
  } finally {
    classLoading.value = false
  }
}

loadClasses()
</script>

<style scoped>
.class-method-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>