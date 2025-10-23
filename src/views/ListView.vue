<template>
    <div class="list-view">
        <!-- 左侧栏 -->
        <div class="ss-card left-panel">
            <div class="panel-header">
                <h3>工作流列表</h3>
            </div>
            <div class="panel-body">

            </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="right-content">
            <div class="content-controller">
                <button @click="showCreateDialog = true">
                    <font-awesome-icon :icon="['fas', 'fa-plus']" />
                </button>
                <label>
                    <font-awesome-icon :icon="['fas', 'fa-magnifying-glass']" />
                    <input type="text" placeholder="搜索..." />
                </label>
            </div>
        </div>

        <!-- 新建工作流弹窗 -->
        <WorkflowDialog v-model="showCreateDialog" @create="handleCreateWorkflow" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { windowManager } from '@app/functions/window'
import { backend } from '@app/functions/backend'
import WorkflowDialog from '@app/components/WorkflowDialog.vue'

const router = useRouter()

// 控制新建弹窗显示
const showCreateDialog = ref(false)

// 处理创建工作流
const handleCreateWorkflow = async (workflow: any) => {
    // 触发类型显示文本映射
    const triggerTypeLabels: { [key: string]: string } = {
        event: '事件',
        notification: '通知'
    }

    // 构建 URL 参数
    const params = new URLSearchParams({
        triggerType: workflow.triggerType,
        triggerTypeLabel: triggerTypeLabels[workflow.triggerType] || workflow.triggerType,
        triggerName: workflow.triggerName === 'custom'
            ? workflow.customTriggerName || ''
            : workflow.triggerName,
        triggerLabel: workflow.triggerLabel || workflow.triggerName,
        name: workflow.name,
        description: workflow.description || ''
    })

    const editUrl = `/edit?${params.toString()}`

    if (backend.isDesktop()) {
        await windowManager.createWindow({
            label: `edit-${Date.now()}`, // 使用时间戳确保唯一性
            url: editUrl,
            title: `编辑工作流 - ${workflow.name}`,
            width: 1200,
            height: 800
        })
    } else {
        router.push(editUrl)
    }
}
</script>

<style scoped>
.list-view {
    background-color: var(--color-bg);
    width: 100%;
    height: 100vh;
    display: flex;
    gap: 10px;
    padding: 10px;
    box-sizing: border-box;
}

/* 左侧面板 */
.left-panel {
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    backdrop-filter: blur(10px);
    height: calc(100vh - 60px);
    width: 200px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
}

.panel-header {
    padding: 15px;
    border-bottom: 1px solid var(--color-card-2);
}

.panel-header h3 {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-font);
    font-weight: bold;
}

.panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

/* 右侧内容区 */
.right-content {
    overflow-y: auto;
    flex: 1;
}
.content-controller {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: end;
}
.content-controller button {
    height: 30px;
    width: 30px;
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    backdrop-filter: blur(10px);
    border-radius: 100%;
    border: none;
    cursor: pointer;
    margin-right: 10px;
    font-size: 1rem;
    color: var(--color-font-2);
}
.content-controller label {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    backdrop-filter: blur(10px);
    border-radius: 99px;
    padding: 5px 10px;
    color: var(--color-font-2);
}
.content-controller label svg {
    font-size: 0.9rem;
}
.content-controller label input {
    height: 20px;
    border: none;
    background: transparent;
    outline: none;
    margin-left: 5px;
    color: var(--color-font);
}
</style>

