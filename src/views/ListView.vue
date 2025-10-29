<template>
    <div class="list-view">
        <!-- 左侧栏：垂直切换标签 -->
        <div class="ss-card left-panel tabs-panel">
            <div class="panel-header">
                <h3>导航</h3>
            </div>
            <div class="panel-body tabs-body">
                <button class="tab-item" :class="{ active: selectedTab === 'all' }" @click="selectTab('all')">
                    <font-awesome-icon :icon="['fas', 'fa-list']" />
                    <span>所有工作流</span>
                </button>
                <button class="tab-item" :class="{ active: selectedTab === 'settings' }" @click="selectTab('settings')">
                    <font-awesome-icon :icon="['fas', 'fa-gear']" />
                    <span>设置</span>
                </button>
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

            <!-- 右侧内容：根据选中标签渲染 -->
            <div class="right-content-inner">
                <!-- 工作流卡片视图（当 selectedTab === 'all'） -->
                <div v-if="selectedTab === 'all'">
                    <div class="workflow-grid">
                        <div v-if="workflowList.length === 0" class="empty-tip">暂无工作流</div>
                        <div class="grid">
                            <div v-for="workflow in filteredWorkflows" :key="workflow.id" class="card"
                                @click="editWorkflow(workflow)">
                                <!-- 删除 (右上角) -->
                                <button class="card-delete" @click.stop="deleteWorkflow(workflow)">✕</button>

                                <div class="card-header">
                                    <div class="card-title">{{ workflow.name }}</div>
                                    <div class="card-sub">{{ workflow.triggerLabel || workflow.triggerName }}</div>
                                </div>
                                <div class="card-body">
                                    <p class="card-desc">{{ workflow.description || '暂无描述' }}</p>
                                </div>

                                <!-- 启用/禁用 与 测试 按钮 (右下角) -->
                                <div class="card-footer">
                                    <button class="btn-small" @click.stop="toggleEnableWorkflow(workflow)">
                                        {{ workflow.enabled ? '禁用' : '启用' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 设置通过新窗口或路由处理 -->
            </div>
        </div>

        <!-- 新建工作流弹窗 -->
        <WorkflowDialog v-model="showCreateDialog" @create="handleCreateWorkflow" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { windowManager } from '@app/functions/window'
import { backend } from '@app/functions/backend'
import { WorkflowStorage } from '@app/functions/workflow'
import type { WorkflowListItem } from '@app/functions/workflow'
import { Logger, LogType, PopInfo, PopType } from '@app/functions/base'
import { connectorManager, RenMessage, runWorkflowByTrigger, type VueFlowWorkflow, WorkflowConverter, type WorkflowExecution } from 'renflow.runner'

import WorkflowDialog from '@app/components/WorkflowDialog.vue'

const router = useRouter()
const popInfo = new PopInfo()
const logger = new Logger()

// 控制新建弹窗显示
const showCreateDialog = ref(false)

// 工作流列表
const workflowList = ref<WorkflowListItem[]>([])

// 搜索关键词
const searchKeyword = ref('')

// 左侧标签状态
const selectedTab = ref<'all' | 'settings'>('all')

function selectTab(tab: 'all' | 'settings') {
    if (tab === 'settings') {
        const settingsUrl = '/settings'
        if (backend.isDesktop()) {
            void windowManager.createWindow({
                label: 'settings',
                url: settingsUrl,
                title: '设置',
                width: 600,
                height: 500
            })
        } else {
            void router.push(settingsUrl)
        }
        return
    }
    selectedTab.value = tab
}

const filteredWorkflows = computed(() => {
    const k = searchKeyword.value.trim().toLowerCase()
    if (!k) return workflowList.value
    return workflowList.value.filter(w => {
        const name = (w.name || '').toLowerCase()
        const label = (w.triggerLabel || w.triggerName || '').toLowerCase()
        return name.includes(k) || label.includes(k)
    })
})

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
// selectWorkflow removed: clicking a card opens edit directly

// 切换启用/禁用工作流
async function toggleEnableWorkflow(workflow: WorkflowListItem) {
    try {
        const full = await WorkflowStorage.load(workflow.id)
        if (!full) {
            popInfo.add(PopType.ERR, '无法加载工作流')
            return
        }

        full.enabled = !full.enabled
        await WorkflowStorage.save(full)
        await loadWorkflowList()
        popInfo.add(PopType.INFO, full.enabled ? '工作流已启用' : '工作流已禁用')
    } catch (e) {
        logger.error(e as Error, '切换工作流状态失败')
        popInfo.add(PopType.ERR, '操作失败')
    }
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
        // 统一使用单一编辑窗口标签 'edit'，避免为每个 workflow 创建多个窗口
        const res = await windowManager.createWindow({
            label: 'edit',
            url: editUrl,
            title: `编辑工作流 - ${workflow.name}`,
            width: 1200,
            height: 800
        })

        // 如果窗口已存在，通知该窗口打开指定的 workflow
        try {
            if (res === 'existing') {
                backend.call('workflow:open', { id: workflow.id })
            }
        } catch (e) {
            logger.add(LogType.ERR, '发射 workflow:open 事件失败', e)
        }
    } else {
        router.push(editUrl)
    }
}

// 删除工作流
async function deleteWorkflow(workflow: WorkflowListItem) {
    try {
        await WorkflowStorage.delete(workflow.id)
        popInfo.add(PopType.INFO, '工作流已删除')

        // 刷新列表
        await loadWorkflowList()
    } catch (error) {
        logger.error(error as unknown as Error, '删除工作流失败')
        popInfo.add(PopType.ERR, '删除工作流失败')
    }
}

// 格式化日期
// formatDate removed (not used in card-only layout). Use a shared util if needed.

// 处理创建工作流
const handleCreateWorkflow = async (workflow: any) => {
    // 构建触发器显示标签（如果是自定义，使用 customTriggerName）
    const triggerLabel = workflow.triggerName === 'custom' ? (workflow.customTriggerName || '') : (workflow.triggerLabel || workflow.triggerName)

    // 构建 URL 参数（不再包含 triggerType）
    const params = new URLSearchParams({
        triggerName: workflow.triggerName,
        triggerLabel: triggerLabel,
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
onMounted(async () => {
    loadWorkflowList()

    // 如果在桌面模式，监听来自其它窗口的工作流更新事件，以便实时刷新列表
    try {
        if (backend.isDesktop()) {
            backend.addListener('workflow:updated', () => {
                void loadWorkflowList()
            })
        }
    } catch (e) {
        logger.add(LogType.ERR, '注册 workflow:updated 事件监听失败', e)
    }

    // 创建一个临时 bot 测试
    const adapterId = 'napcat'
    const adapter = await connectorManager.createBotAdapter('napcat', {
    }, adapterId)

    // 本地订阅适配器事件
    adapter.on(['message', 'message_mine'], (p: RenMessage) => {
        const eventName = p.isMine ? 'message_mine' : 'message'
        runFlow(p, workflowList.value.filter(w => w.triggerName === eventName && w.enabled))
    })

    await adapter.connect()
})

const runFlow = async (data: any, workflowList: WorkflowListItem[]) => {
    const converter = new WorkflowConverter()
    // 装载所有 workflowList
    const loadedWorkflows: WorkflowExecution[] = []
    for (const workflowItem of workflowList) {
        const full = await WorkflowStorage.load(workflowItem.id)
        if (full) {
            loadedWorkflows.push(converter.convert(full as unknown as VueFlowWorkflow))
        } else {
            logger.add(LogType.ERR, `加载工作流失败: ${workflowItem.id}`)
        }
    }

    runWorkflowByTrigger(loadedWorkflows, data, { timeout: 60000 }, {
        onWorkflowStart: async (workflowId: string): Promise<boolean> => {
            // 如果不是桌面模式，编辑窗口不会接管执行，应当允许工作流继续执行
            if (!backend.isDesktop()) return true

            try {
                const { emit, listen } = await import('@tauri-apps/api/event')

                // 监听一次性的 handled 事件（短超时）
                const handledPromise = new Promise<boolean>((resolve) => {
                    const unlistenPromise = (listen as any)('workflow:execute:handled', (evt: any) => {
                        const payload = evt?.payload || {}
                        if (payload.id === workflowId) {
                            resolve(true)
                        }
                    })

                    // 如果 400ms 内未被处理则认为未被接管
                    setTimeout(async () => {
                        try {
                            const u = await unlistenPromise
                            if (u && typeof u === 'function') u()
                        } catch (e) {
                            logger.add(LogType.DEBUG, 'unlisten 调用失败', e)
                        }
                        resolve(false)
                    }, 400)
                })

                // 发出请求，编辑窗口若打开且匹配会在收到后处理并发回 handled
                // 带上触发数据 data，便于编辑窗口在本地重放执行
                void emit('workflow:execute:request',
                    { id: workflowId, data, type: data.constructor.name })
                const handled = await handledPromise

                return !handled
            } catch (e) {
                logger.add(LogType.ERR, '询问编辑窗口接管执行失败', e)
                // 出错时默认允许执行
                return true
            }
        },
        onNodeStart: async (workflowId: string, nodeId: string) => {
            try {
                if (backend.isDesktop()) {
                    const { emit } = await import('@tauri-apps/api/event')
                    void emit('workflow:execute:nodeStart', { id: workflowId, nodeId })
                }
            } catch (e) {
                logger.add(LogType.ERR, '发射 workflow:execute:nodeStart 事件失败', e)
            }
        },
        onNodeComplete: async (workflowId: string, nodeId: string) => {
            try {
                if (backend.isDesktop()) {
                    const { emit } = await import('@tauri-apps/api/event')
                    void emit('workflow:execute:nodeComplete', { id: workflowId, nodeId })
                }
            } catch (e) {
                logger.add(LogType.ERR, '发射 workflow:execute:nodeComplete 事件失败', e)
            }
        },
        onNodeError: async (workflowId: string, nodeId: string, error: any) => {
            try {
                if (backend.isDesktop()) {
                    const { emit } = await import('@tauri-apps/api/event')
                    void emit('workflow:execute:nodeError', { id: workflowId, nodeId, error: String(error) })
                }
            } catch (e) {
                logger.add(LogType.ERR, '发射 workflow:execute:nodeError 事件失败', e)
            }
        },
        onWorkflowComplete: async (workflowId: string, workflowResult: any) => {
            try {
                if (backend.isDesktop()) {
                    const { emit } = await import('@tauri-apps/api/event')
                    void emit('workflow:execute:complete', { id: workflowId, success: !!workflowResult.success, logs: workflowResult.logs })
                }
            } catch (e) {
                logger.add(LogType.ERR, '发射 workflow:execute:complete 事件失败', e)
            }
        }
    })
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

/* 左侧标签面板 */
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
    font-size: 0.95rem;
    color: var(--color-font);
}

.tabs-body {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-font-2);
}

.tab-item.active {
    background: rgba(var(--color-card-2-rgb), 0.12);
    color: var(--color-font);
}

/* 右侧主区域 */
.right-content {
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column
}

.content-controller {
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px
}

.content-controller button {
    height: 32px;
    width: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(var(--color-card-rgb), 0.5);
    color: var(--color-font-2);
    cursor: pointer
}

.content-controller label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(var(--color-card-rgb), 0.5);
}

.content-controller input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--color-font)
}

.detail-card {
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    padding: 20px;
    border-radius: 10px
}

.workflow-description {
    color: var(--color-font-2);
    margin: 8px 0 16px
}

.workflow-info {
    margin: 12px 0
}

.info-item {
    padding: 8px 0;
    border-bottom: 1px solid var(--color-card-2)
}

.info-label {
    color: var(--color-font-2);
    font-size: 0.85rem
}

.info-value {
    color: var(--color-font);
    margin-left: 8px
}

.workflow-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px
}

.btn-primary {
    background: var(--color-main);
    color: var(--color-font-r);
    padding: 8px 14px;
    border-radius: 6px
}

.btn-danger {
    background: rgba(255, 59, 48, 0.8);
    color: #fff;
    padding: 8px 14px;
    border-radius: 6px
}

/* 卡片网格 */
.workflow-grid .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    margin-top: 12px
}

.card {
    background: rgba(var(--color-card-rgb), 0.5);
    padding: 12px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: space-between
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center
}

.card-title {
    font-weight: 600;
    color: var(--color-font)
}

.card-sub {
    color: var(--color-font-2);
    font-size: 0.85rem
}

.card-body {
    margin: 8px 0
}

.card-desc {
    color: var(--color-font-2);
    font-size: 0.9rem;
    max-height: 3.6em;
    overflow: hidden
}

.card-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end
}

.btn-small {
    padding: 6px 10px;
    border-radius: 6px;
    background: rgba(var(--color-card-rgb), 0.4);
    border: none;
    cursor: pointer
}

.btn-small.btn-danger {
    background: rgba(255, 59, 48, 0.8);
    color: #fff
}

.settings-panel {
    padding: 12px
}

/* utility */
.empty-tip {
    text-align: center;
    color: var(--color-font-2);
    padding: 18px
}
</style>
