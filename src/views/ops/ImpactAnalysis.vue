<template>
  <div class="impact-analysis">
    <el-card header="影响范围分析">
      <el-form :model="analysisForm" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="项目名称">
              <el-select v-model="analysisForm.project" placeholder="选择项目" filterable>
                <el-option
                  v-for="project in projects"
                  :key="project"
                  :label="project"
                  :value="project"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分析类型">
              <el-select v-model="analysisForm.type">
                <el-option label="类变更影响" value="class" />
                <el-option label="方法变更影响" value="method" />
                <el-option label="接口变更影响" value="interface" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="目标对象">
          <el-input
            v-model="analysisForm.target"
            type="textarea"
            :rows="3"
            placeholder="输入类名或方法名，多个用换行分隔"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="runAnalysis" :loading="analyzing">
            开始分析
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card header="分析结果" class="mt-4" v-if="results.length > 0">
      <el-table :data="results" stripe>
        <el-table-column prop="target" label="目标" width="200" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="impactCount" label="影响数量" width="100" />
        <el-table-column prop="impactedFiles" label="影响文件">
          <template #default="{ row }">
            <el-tag v-for="file in row.impactedFiles.slice(0, 5)" :key="file" class="mr-1">
              {{ file }}
            </el-tag>
            <el-tag v-if="row.impactedFiles.length > 5" type="info">
              +{{ row.impactedFiles.length - 5 }} more
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { opsApi } from '@/api/ops'

const analyzing = ref(false)
const projects = ref<string[]>([])
const results = ref<any[]>([])

const analysisForm = reactive({
  project: '',
  type: 'class',
  target: ''
})

const loadProjects = async () => {
  try {
    const res = await opsApi.getProjects()
    projects.value = res.data || []
  } catch (error) {
    console.error('Failed to load projects:', error)
  }
}

const runAnalysis = async () => {
  if (!analysisForm.project || !analysisForm.target) {
    return
  }
  analyzing.value = true
  try {
    const res = await opsApi.runImpactAnalysis(analysisForm)
    results.value = res.data || []
  } catch (error) {
    console.error('Analysis failed:', error)
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.mt-4 {
  margin-top: 16px;
}
.mr-1 {
  margin-right: 4px;
}
</style>