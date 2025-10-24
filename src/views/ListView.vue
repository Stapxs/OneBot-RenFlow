<template>
    <div class="list-view">
        <!-- 左侧栏 -->
        <div class="ss-card left-panel">
            <div class="panel-header">
                <h3>工作流列表</h3>
            </div>
            <div class="panel-body">
                <div v-if="workflowList.length === 0" class="empty-tip">
                    暂无工作流
                </div>
                <div
                    v-for="workflow in workflowList"
                    :key="workflow.id"
                    class="workflow-item"
                    :class="{ active: selectedWorkflow?.id === workflow.id }"
                    @click="selectWorkflow(workflow)">
                    <div class="workflow-item-icon">
                        <font-awesome-icon :icon="['fas', 'fa-diagram-project']" />
                    </div>
                    <div class="workflow-item-content">
                        <div class="workflow-item-name">{{ workflow.name }}</div>
                        <div class="workflow-item-trigger">{{ workflow.triggerTypeLabel }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="right-content">
            <div class="content-controller">
                <button title="新建工作流" @click="showCreateDialog = true">
                    <font-awesome-icon :icon="['fas', 'fa-plus']" />
                </button>
                <button title="刷新列表" @click="refreshWorkflowList">
                    <font-awesome-icon :icon="['fas', 'fa-rotate-right']" />
                </button>
                <label>
                    <font-awesome-icon :icon="['fas', 'fa-magnifying-glass']" />
                    <input v-model="searchKeyword" type="text" placeholder="搜索...">
                </label>
            </div>

            <!-- 工作流详情 -->
            <div v-if="selectedWorkflow" class="workflow-detail">
                <div class="ss-card detail-card">
                    <h2>{{ selectedWorkflow.name }}</h2>
                    <p class="workflow-description">{{ selectedWorkflow.description || '暂无描述' }}</p>

                    <div class="workflow-info">
                        <div class="info-item">
                            <span class="info-label">触发器类型：</span>
                            <span class="info-value">{{ selectedWorkflow.triggerTypeLabel }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">触发器名称：</span>
                            <span class="info-value">{{ selectedWorkflow.triggerLabel }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">创建时间：</span>
                            <span class="info-value">{{ formatDate(selectedWorkflow.createdAt) }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">更新时间：</span>
                            <span class="info-value">{{ formatDate(selectedWorkflow.updatedAt) }}</span>
                        </div>
                    </div>

                    <div class="workflow-actions">
                        <button class="btn-primary" @click="editWorkflow(selectedWorkflow)">
                            <font-awesome-icon :icon="['fas', 'fa-edit']" />
                            编辑
                        </button>
                        <button class="btn-danger" @click="deleteWorkflow(selectedWorkflow)">
                            <font-awesome-icon :icon="['fas', 'fa-trash']" />
                            删除
                        </button>
                    </div>
                </div>
            </div>
            <div v-else class="no-selection">
                <font-awesome-icon :icon="['fas', 'fa-hand-pointer']" />
                <p>请选择一个工作流</p>
            </div>
        </div>

        <!-- 新建工作流弹窗 -->
        <WorkflowDialog v-model="showCreateDialog" @create="handleCreateWorkflow" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { windowManager } from '@app/functions/window'
import { backend } from '@app/functions/backend'
import { WorkflowStorage } from '@app/functions/workflow'
import type { WorkflowListItem } from '@app/functions/workflow'
import { Logger, LogType, PopInfo, PopType } from '@app/functions/base'
import WorkflowDialog from '@app/components/WorkflowDialog.vue'

const router = useRouter()
const popInfo = new PopInfo()
const logger = new Logger()

// 控制新建弹窗显示
const showCreateDialog = ref(false)

// 工作流列表
const workflowList = ref<WorkflowListItem[]>([])

// 选中的工作流
const selectedWorkflow = ref<WorkflowListItem | null>(null)

// 搜索关键词
const searchKeyword = ref('')

// 加载工作流列表
async function loadWorkflowList() {
    try {
        workflowList.value = await WorkflowStorage.list()
        logger.add(LogType.INFO, '工作流列表已加载：', workflowList.value)
    } catch (error) {
        logger.error(error as unknown as Error, '加载工作流列表失败')
        popInfo.add(PopType.ERR, '加载工作流列表失败')
    }
}

// 刷新工作流列表
async function refreshWorkflowList() {
    await loadWorkflowList()
    popInfo.add(PopType.INFO, '列表已刷新')
}

// 选择工作流
function selectWorkflow(workflow: WorkflowListItem) {
    selectedWorkflow.value = workflow
}

// 编辑工作流
async function editWorkflow(workflow: WorkflowListItem) {
    const params = new URLSearchParams({
        id: workflow.id,
        triggerType: workflow.triggerType,
        triggerTypeLabel: workflow.triggerTypeLabel,
        triggerName: workflow.triggerName,
        triggerLabel: workflow.triggerLabel,
        name: workflow.name,
        description: workflow.description || ''
    })

    const editUrl = `/edit?${params.toString()}`

    if (backend.isDesktop()) {
        await windowManager.createWindow({
            label: `edit-${workflow.id}`,
            url: editUrl,
            title: `编辑工作流 - ${workflow.name}`,
            width: 1200,
            height: 800
        })
    } else {
        router.push(editUrl)
    }
}

// 删除工作流
async function deleteWorkflow(workflow: WorkflowListItem) {
    if (!confirm(`确定要删除工作流 "${workflow.name}" 吗？`)) {
        return
    }

    try {
        await WorkflowStorage.delete(workflow.id)
        popInfo.add(PopType.INFO, '工作流已删除')

        // 刷新列表
        await loadWorkflowList()

        // 如果删除的是当前选中的工作流，清空选中状态
        if (selectedWorkflow.value?.id === workflow.id) {
            selectedWorkflow.value = null
        }
    } catch (error) {
        logger.error(error as unknown as Error, '删除工作流失败')
        popInfo.add(PopType.ERR, '删除工作流失败')
    }
}

// 格式化日期
function formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

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
        triggerName: workflow.triggerName === 'custom' ? workflow.customTriggerName || '' : workflow.triggerName,
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

// 组件挂载时加载工作流列表
onMounted(() => {
    loadWorkflowList()
})
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

.empty-tip {
    text-align: center;
    color: var(--color-font-2);
    font-size: 0.85rem;
    padding: 20px;
}

.workflow-item {
    background: rgba(var(--color-card-2-rgb), 0.5);
    border-radius: 7px;
    padding: 10px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.3s;
}

.workflow-item:hover {
    background: rgba(var(--color-card-2-rgb), 0.8);
    transform: translateX(3px);
}

.workflow-item.active {
    background: rgba(var(--color-main-rgb), 0.2);
    border: 1px solid var(--color-main);
}

.workflow-item-icon {
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--color-main-rgb), 0.2);
    border-radius: 7px;
    color: var(--color-main);
}

.workflow-item-icon svg {
    width: 18px;
    height: 18px;
}

.workflow-item-content {
    flex: 1;
    min-width: 0;
}

.workflow-item-name {
    color: var(--color-font);
    font-size: 0.85rem;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.workflow-item-trigger {
    color: var(--color-font-2);
    font-size: 0.75rem;
    margin-top: 2px;
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
    gap: 10px;
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
    font-size: 1rem;
    color: var(--color-font-2);
    transition: all 0.3s;
}

.content-controller button:hover {
    background: rgba(var(--color-main-rgb), 0.2);
    color: var(--color-main);
}

.workflow-detail {
    margin-top: 20px;
}

.detail-card {
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    backdrop-filter: blur(10px);
    padding: 25px;
    border-radius: 10px;
}

.detail-card h2 {
    margin: 0 0 10px 0;
    color: var(--color-font);
    font-size: 1.5rem;
}

.workflow-description {
    color: var(--color-font-2);
    font-size: 0.9rem;
    margin: 0 0 20px 0;
}

.workflow-info {
    margin: 20px 0;
}

.info-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--color-card-2);
}

.info-label {
    color: var(--color-font-2);
    font-size: 0.85rem;
}

.info-value {
    color: var(--color-font);
    font-size: 0.9rem;
    margin-left: 10px;
}

.workflow-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.workflow-actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;
}

.btn-primary {
    background: var(--color-main);
    color: var(--color-font-r);
}

.btn-primary:hover {
    opacity: 0.8;
    transform: translateY(-2px);
}

.btn-danger {
    background: rgba(255, 59, 48, 0.8);
    color: white;
}

.btn-danger:hover {
    background: rgba(255, 59, 48, 1);
    transform: translateY(-2px);
}

.no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: var(--color-font-2);
}

.no-selection svg {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.5;
}

.no-selection p {
    font-size: 1rem;
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

