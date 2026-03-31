<template>
  <!-- This component is used as a utility, no template needed -->
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const allowedFileTypes = [
  '.java', '.ts', '.js', '.vue', '.json',
  '.xml', '.yml', '.yaml', '.md', '.txt',
  '.sql', '.py', '.go'
]

/**
 * Read file content
 */
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content || '')
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Handle file upload
 */
async function handleFileUpload(file: File): Promise<string | null> {
  try {
    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedFileTypes.includes(ext)) {
      ElMessage.warning(`不支持的文件类型: ${ext}`)
      return null
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      ElMessage.warning('文件大小不能超过 10MB')
      return null
    }

    // Read file content
    const content = await readFileContent(file)

    // Generate prompt
    const prompt = `请分析文件 "${file.name}" ：

\`\`\`
${content.slice(0, 3000)}${content.length > 3000 ? '\n... (内容已截断)' : ''}
\`\`\`
`

    ElMessage.success('文件已加载，请输入具体问题')
    return prompt
  } catch (error) {
    ElMessage.error('读取文件失败')
    return null
  }
}

defineExpose({
  allowedFileTypes,
  handleFileUpload
})
</script>