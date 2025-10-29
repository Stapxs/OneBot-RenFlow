<template>
    <div class="edit-view" @drop="onDrop">
        <!-- 工具栏 -->
        <div class="toolbar">
            <button class="toolbar-btn save-btn" @click="saveWorkflow">
                <font-awesome-icon :icon="['fas', 'fa-floppy-disk']" />
                保存
            </button>
            <button class="toolbar-btn" @click="exportExecutionData">
                <font-awesome-icon :icon="['fas', 'fa-file-export']" />
                导出独立配置
            </button>
            <button class="toolbar-btn execute-btn" @click="executeWorkflow">
                <font-awesome-icon :icon="['fas', workflowEnabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
                {{ workflowEnabled ? '禁用工作流' : '启用工作流' }}
            </button>
        </div>

        <VueFlow v-model:nodes="nodes" v-model:edges="edges"
            @connect="onConnect"
            @edge-double-click="onEdgeDoubleClick"
            @dragover="onDragOver">
            <Controls />
            <Background
                :gap="35"
                variant="dots"
                :style="{
                    backgroundColor: 'rgba(var(--color-main-rgb), 0.1)',
                    transition: 'background-color 0.2s ease',
                }" />

            <template #node-base="baseNodeProps">
                <BaseNode v-bind="baseNodeProps" />
            </template>

            <template #node-note="noteNodeProps">
                <NoteNode v-bind="noteNodeProps" />
            </template>

            <template #node-ifelse="ifelseNodeProps">
                <IfElseNode v-bind="ifelseNodeProps" />
            </template>

            <template #node-trigger="triggerNodeProps">
                <TriggerNode v-bind="triggerNodeProps" />
            </template>

            <template #edge-base="baseEdgeProps">
                <BaseEdge v-bind="baseEdgeProps" />
            </template>
        </VueFlow>
        <div class="ss-card node-list">
            <BcTab class="dept-list">
                <div icon="fa-bars-staggered">
                    <div class="node-list-search">
                        <label>
                            <font-awesome-icon :icon="['fas', 'fa-magnifying-glass']" />
                            <input v-model="searchKeyword" type="text"
                                placeholder="搜索分类或名称……">
                        </label>
                    </div>
                    <div class="node-list-body">
                        <div v-for="item in filteredNodes" :key="item.id"
                            :draggable="true"
                            @dragstart="onDragStart($event, item)">
                            <font-awesome-icon :icon="['fas', item.icon || 'fa-cube']" />
                            <div>
                                <span><span>{{ categoryNames[item.category] || item.category }}</span>{{ item.name }}</span>
                                <a>{{ item.description }}</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div icon="fa-info-circle" class="flow-info">
                    <div class="flow-info-card">
                        <header>工作流信息</header>
                        <div v-if="!editingFlow" class="flow-summary">
                            <div class="flow-row">
                                <label>名称</label>
                                <div class="flow-value">{{ workflowInfo.name || '未命名工作流' }}</div>
                            </div>
                            <div class="flow-row">
                                <label>触发器</label>
                                <div class="flow-value">{{ workflowInfo.triggerLabel || workflowInfo.triggerTypeLabel || '-' }}</div>
                            </div>
                            <div class="flow-row">
                                <label>描述</label>
                                <div class="flow-value flow-desc">{{ workflowInfo.description || '-' }}</div>
                            </div>
                            <div class="flow-actions">
                                <button class="edit-btn" @click="openFlowEditor">编辑</button>
                            </div>
                        </div>

                        <div v-else class="flow-edit">
                            <div class="flow-row">
                                <label>名称</label>
                                <input v-model="localFlow.name" type="text" placeholder="工作流名称">
                            </div>
                            <div class="flow-row">
                                <label>触发器标签</label>
                                <input v-model="localFlow.triggerLabel" type="text" placeholder="触发器标签">
                            </div>
                            <div class="flow-row">
                                <label>描述</label>
                                <textarea v-model="localFlow.description" rows="3" placeholder="工作流描述" />
                            </div>
                            <div class="flow-actions">
                                <button class="cancel-btn" @click="cancelFlowEdit">取消</button>
                                <button class="save-btn" @click="saveFlowEdit">保存</button>
                            </div>
                        </div>
                    </div>
                    <div v-if="selectedNode" class="flow-info-card">
                        <header>选中节点</header>
                        <div class="selected-node-card">
                            <div class="flow-row">
                                <label>节点 ID</label>
                                <div class="flow-value">{{ (selectedNode as any).id }}</div>
                            </div>
                            <div class="flow-row">
                                <label>类型</label>
                                <div class="flow-value">{{ (selectedNode as any).type }}</div>
                            </div>
                            <div class="flow-row">
                                <label>标题</label>
                                <div class="flow-value">{{ (selectedNode as any).data?.label || '-' }}</div>
                            </div>

                            <div v-if="selectedNodeInputs.length > 0" class="flow-row">
                                <label>输入 (来自上游)</label>
                                <div class="flow-value param-preview">
                                    <pre>{{ selectedNodeInputsText }}</pre>
                                </div>
                            </div>

                            <div v-if="selectedNodeOutputs.length > 0" class="flow-row">
                                <label>输出 (schema)</label>
                                <div class="flow-value param-preview">
                                    <pre>{{ selectedNodeOutputsText }}</pre>
                                </div>
                            </div>

                            <div class="flow-actions">
                                <button class="edit-btn" @click="focusOnNode((selectedNode as any))">聚焦</button>
                            </div>
                        </div>
                    </div>
                </div>
            </BcTab>
        </div>
    </div>
</template>

<script setup lang="ts">
import { LogLevel, init, nodeManager as runnerNodeManager, WorkflowConverter, runWorkflow, RenMessage } from 'renflow.runner'

import type { NodeMetadata, VueFlowWorkflow } from 'renflow.runner'
import type { Node, Edge } from '@vue-flow/core'

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Background } from '@vue-flow/background'

import BcTab from 'vue3-bcui/packages/bc-tab'

import BaseNode from '@app/components/BaseNode.vue'
import BaseEdge from '@app/components/BaseEdge.vue'

import TriggerNode from '@app/components/nodes/TriggerNode.vue'
import NoteNode from '@app/components/nodes/NoteNode.vue'
import IfElseNode from '@app/components/nodes/IfElseNode.vue'

import { WorkflowStorage } from '@app/functions/workflow'
import { backend } from '@app/functions/backend'
import type { WorkflowData } from '@app/functions/workflow'
import { toast } from '@app/functions/toast'
import { Logger, LogType } from '@app/functions/base'

const route = useRoute()
const {
    onNodeDrag,
    getIntersectingNodes,
    getIncomers,
    findNode,
    updateNode,
    addEdges,
    addNodes,
    project,
    setCenter,
    getViewport
} = useVueFlow()

const logger = new Logger()

// 初始化 renflow.runner（集中初始化入口）
init(LogLevel.DEBUG, {
    debug: (_: string, ...args: any[]) => {
        logger.debug(args[0])
    },
    info: (_: string, ...args: any[]) => {
        logger.info(args[0])
    },
    warn: (_: string, ...args: any[]) => {
        logger.add(LogType.ERR, '', args)
    },
    error: (_: string, ...args: any[]) => {
        logger.add(LogType.ERR, '', args)
    }
})

const nodeManager = runnerNodeManager
const workflowConverter = new WorkflowConverter()

// 当前工作流启用状态
const workflowEnabled = ref(false)

// 工作流信息
const workflowInfo = ref({
    id: '' as string | undefined,
    triggerType: '',
    triggerTypeLabel: '',
    triggerName: '',
    triggerLabel: '',
    name: '',
    description: ''
})

// 右侧 flow 信息的编辑状态与临时副本
const editingFlow = ref(false)
const localFlow = ref({ ...workflowInfo.value })

// 打开编辑器（复制当前值到本地副本）
function openFlowEditor() {
    localFlow.value = { ...workflowInfo.value }
    editingFlow.value = true
}

function cancelFlowEdit() {
    editingFlow.value = false
}

async function saveFlowEdit() {
    // 把本地副本合并回 workflowInfo
    workflowInfo.value = { ...workflowInfo.value, ...localFlow.value }

    // 调用已有的保存逻辑以持久化（也会保存当前节点/边）
    await saveWorkflow()

    editingFlow.value = false
}

// 当外部 workflowInfo 变化时，如果不在编辑状态则同步本地副本
watch(workflowInfo, (newVal) => {
    if (!editingFlow.value) {
        localFlow.value = { ...newVal }
    }
}, { deep: true })

// 从 URL 参数获取工作流信息
onMounted(async () => {
    const query = route.query
    if (query.triggerName && query.name) {
        workflowInfo.value = {
            id: query.id as string | undefined,
            triggerType: (query.triggerType as string) || '',
            triggerTypeLabel: (query.triggerTypeLabel as string) || (query.triggerLabel as string) || (query.triggerType as string) || '',
            triggerName: query.triggerName as string,
            triggerLabel: (query.triggerLabel as string) || query.triggerName as string,
            name: query.name as string,
            description: (query.description as string) || ''
        }

        logger.add(LogType.INFO, '工作流信息:', workflowInfo.value)

        // 如果有 ID，尝试加载工作流
        if (query.id) {
            await loadWorkflowById(query.id as string)
        } else {
            // 创建触发器节点，并为节点附加 metadata 以便前端能够识别其输出结构
            const triggerMeta: any = {
                id: 'trigger',
                name: '触发器',
                description: `触发器: ${workflowInfo.value.triggerLabel}`,
                category: 'input',
                params: [],
                icon: 'bolt'
            }

            // 如果是 message 触发器，动态根据 RenMessage class 生成输出结构（不包含 description）
            if (workflowInfo.value.triggerName === 'message') {
                try {
                    const rm = new RenMessage()
                    const keys = Object.keys(rm) as string[]
                    triggerMeta.outputSchema = keys.map(k => {
                        const v = (rm as any)[k]
                        let t: string = 'any'
                        if (v === null || v === undefined) {
                            t = 'any'
                        } else if (v instanceof Date) {
                            t = 'string'
                        } else if (Array.isArray(v)) {
                            t = 'array'
                        } else {
                            const typ = typeof v
                            if (typ === 'string') t = 'string'
                            else if (typ === 'number') t = 'number'
                            else if (typ === 'boolean') t = 'boolean'
                            else if (typ === 'object') t = 'object'
                            else t = 'any'
                        }
                        return { key: k, label: k, type: t }
                    })
                } catch (e) {
                    triggerMeta.outputSchema = [
                        { key: 'messageId', label: 'messageId', type: 'string' },
                        { key: 'message', label: 'message', type: 'any' },
                        { key: 'time', label: 'time', type: 'string' }
                    ]
                }
            }

            nodes.value = [{
                id: workflowInfo.value.triggerName,
                type: 'trigger',
                position: { x: 0, y: 0 },
                data: {
                    triggerName: workflowInfo.value.triggerName,
                    triggerLabel: workflowInfo.value.triggerLabel,
                    metadata: triggerMeta
                }
            }]
            // 新建时默认未启用
            workflowEnabled.value = false
        }

        // 更新节点 ID 计数器
        updateNodeIdCounter()

        // 获取窗口宽度
        const width = window.innerWidth
        let { zoom } = getViewport()
        setCenter(width / 3, 0, { zoom: zoom, duration: 200 })
    }
})

/**
 * 保存工作流
 */
async function saveWorkflow() {
    try {
        // 调试：打印当前 nodes 数据
        logger.add(LogType.DEBUG, '准备保存的 nodes:', JSON.parse(JSON.stringify(nodes.value)))
        logger.add(LogType.DEBUG, '准备保存的 edges:', JSON.parse(JSON.stringify(edges.value)))

        const workflowData: Partial<WorkflowData> = {
            id: workflowInfo.value.id,
            name: workflowInfo.value.name,
            description: workflowInfo.value.description,
            triggerType: workflowInfo.value.triggerType,
            triggerTypeLabel: workflowInfo.value.triggerTypeLabel,
            triggerName: workflowInfo.value.triggerName,
            triggerLabel: workflowInfo.value.triggerLabel,
            enabled: workflowEnabled.value,
            nodes: JSON.parse(JSON.stringify(nodes.value)), // 深拷贝确保数据完整
            edges: JSON.parse(JSON.stringify(edges.value))
        }

        const saved = await WorkflowStorage.save(workflowData)
        workflowInfo.value.id = saved.id

        // 在桌面模式下，通知其他窗口工作流已更新（例如 ListView）
        try {
            if (backend.isDesktop()) {
                const { emit } = await import('@tauri-apps/api/event')
                void emit('workflow:updated', { id: saved.id, enabled: saved.enabled })
            }
        } catch (e) {
            logger.add(LogType.ERR, '触发 workflow:updated 事件失败', e)
        }
        // 使用 Toast 通知
        toast.success(`工作流已保存: ${saved.name}`)
        logger.add(LogType.INFO, '工作流已保存:', saved)
    } catch (error) {
        toast.error('保存工作流失败')
        logger.error(error as unknown as Error, '保存工作流失败')
    }
}

/**
 * 根据 ID 加载工作流
 */
async function loadWorkflowById(id: string) {
    try {
        const workflow = await WorkflowStorage.load(id)
        if (workflow) {
            logger.add(LogType.INFO, '加载的工作流数据:', workflow)
            logger.add(LogType.DEBUG, '加载的 nodes:', workflow.nodes)
            logger.add(LogType.DEBUG, '加载的 edges:', workflow.edges)

            workflowInfo.value = {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                triggerType: workflow.triggerType,
                triggerTypeLabel: workflow.triggerTypeLabel,
                triggerName: workflow.triggerName,
                triggerLabel: workflow.triggerLabel
            }

            // 恢复启用状态
            workflowEnabled.value = !!workflow.enabled

            // 确保完整恢复节点和边数据
            nodes.value = workflow.nodes || []
            edges.value = workflow.edges || []

            // 更新节点 ID 计数器，避免新节点 ID 冲突
            updateNodeIdCounter()

            // 使用 Toast 通知
            toast.success(`工作流已加载: ${workflow.name}`)
            logger.add(LogType.INFO, '工作流已加载完成，当前 nodes.value:', nodes.value)
        } else {
            toast.error('工作流不存在')
        }
    } catch (error) {
        toast.error('加载工作流失败')
        logger.error(error as unknown as Error, '加载工作流失败')
    }
}

/**
 * 导出独立配置
 */
function exportExecutionData() {
    try {
        // 检查是否有节点
        if (nodes.value.length === 0) {
            toast.error('当前工作流为空，无法导出')
            return
        }

        // 构建 VueFlowWorkflow 数据
        const vueFlowWorkflow: VueFlowWorkflow = {
            id: workflowInfo.value.id || `workflow_temp_${Date.now()}`,
            name: workflowInfo.value.name || '未命名工作流',
            description: workflowInfo.value.description || '',
            triggerType: workflowInfo.value.triggerType,
            triggerTypeLabel: workflowInfo.value.triggerTypeLabel,
            triggerName: workflowInfo.value.triggerName,
            triggerLabel: workflowInfo.value.triggerLabel,
            nodes: JSON.parse(JSON.stringify(nodes.value)),
            edges: JSON.parse(JSON.stringify(edges.value)),
            createdAt: Date.now(),
            updatedAt: Date.now()
        }

        // 转换为执行数据
        const executionData = workflowConverter.convert(vueFlowWorkflow)

        // 验证执行数据
        const validation = workflowConverter.validate(executionData)
        if (!validation.valid) {
            logger.add(LogType.ERR, '工作流验证失败:', validation.errors)
            toast.error(`工作流验证失败:\n${validation.errors.join('\n')}`)
            return
        }

        // 导出为 JSON 文件
        const jsonStr = JSON.stringify(executionData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${executionData.name}_execution.json`
        a.click()
        URL.revokeObjectURL(url)

        toast.success('执行数据已导出')
        logger.add(LogType.INFO, '导出的执行数据:', executionData)
    } catch (error) {
        toast.error('导出独立配置失败')
        logger.error(error as unknown as Error, '导出独立配置失败')
    }
}

/**
 * 执行工作流
 */
async function executeWorkflow() {
    try {
        // 将 "执行" 操作改为切换启用状态并持久化
        if (nodes.value.length === 0) {
            toast.error('当前工作流为空，无法启用/禁用')
            return
        }

        // 如果还没有 ID，先保存工作流以获得 ID
        if (!workflowInfo.value.id) {
            await saveWorkflow()
        }

        const id = workflowInfo.value.id as string
        const full = await WorkflowStorage.load(id)
        if (!full) {
            toast.error('无法加载工作流以切换状态')
            return
        }

        full.enabled = !full.enabled
        const saved = await WorkflowStorage.save(full)
        workflowEnabled.value = !!saved.enabled

        toast.success(saved.enabled ? '工作流已启用' : '工作流已禁用')
        logger.add(LogType.INFO, `工作流 ${saved.id} 状态已切换: ${saved.enabled}`)

        // 在桌面模式下广播事件给其他窗口（如 ListView）实时刷新
        try {
            if (backend.isDesktop()) {
                const { emit } = await import('@tauri-apps/api/event')
                void emit('workflow:updated', { id: saved.id, enabled: saved.enabled })
            }
        } catch (e) {
            logger.add(LogType.ERR, '触发 workflow:updated 事件失败', e)
        }
    } catch (error) {
        toast.error('切换工作流启用状态失败')
        logger.error(error as unknown as Error, '切换工作流启用状态失败')
    }
}

/**
 * 高亮/取消高亮节点（用于外部执行可视化）
 */
function highlightNode(nodeId: string, highlight: boolean) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
        updateNode(nodeId, {
            class: highlight ? 'executing' : ''
        })
    }
}

// 在桌面模式下监听执行事件以实现可视化（从 ListView 发出的事件）
onMounted(async () => {
    try {
        if (backend.isDesktop()) {
            // 监听编辑器打开请求（当 ListView 请求打开已存在的编辑窗口时）
            backend.addListener('workflow:open', async (evt: any) => {
                const payload = evt?.payload || {}
                const id = payload.id
                if (id) {
                    await loadWorkflowById(id)
                }
            })

            // 监听执行接管请求：如果当前编辑的工作流被请求执行，则在编辑窗口内以 minDelay=1000 执行并回复 handled
            backend.addListener('workflow:execute:request', async (evt: any) => {
                const payload = evt?.payload || {}
                const id = payload.id

                const type = payload.type
                const triggerP = payload.data
                // payload 传递会丢失类型信息，需手动还原
                if(type && triggerP.constructor?.name != type) {
                    triggerP.__meta__ = {
                        className: type
                    }
                }

                if (id !== workflowInfo.value.id) return

                // 回复已接管，ListView 会根据此回应跳过本地执行
                try {
                    const { emit } = await import('@tauri-apps/api/event')
                    void emit('workflow:execute:handled', { id })
                } catch (e) {
                    logger.add(LogType.ERR, '发射 workflow:execute:handled 事件失败', e)
                }

                // 在编辑窗口内执行工作流，使用 minDelay=1000
                try {
                    // 构建执行数据
                    if (!workflowInfo.value.id) return
                    const vueFlowWorkflow: VueFlowWorkflow = {
                        id: workflowInfo.value.id || `workflow_temp_${Date.now()}`,
                        name: workflowInfo.value.name || '未命名工作流',
                        description: workflowInfo.value.description || '',
                        triggerType: workflowInfo.value.triggerType,
                        triggerTypeLabel: workflowInfo.value.triggerTypeLabel,
                        triggerName: workflowInfo.value.triggerName,
                        triggerLabel: workflowInfo.value.triggerLabel,
                        nodes: JSON.parse(JSON.stringify(nodes.value)),
                        edges: JSON.parse(JSON.stringify(edges.value)),
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }

                    const executionData = workflowConverter.convert(vueFlowWorkflow)

                    runWorkflow(executionData, triggerP, {
                        minDelay: 1000,
                        timeout: 60000
                    }, {
                        onNodeStart: async (nodeId: string) => {
                            // 本窗口可视化
                            highlightNode(nodeId, true)
                            // 广播节点开始事件供其他窗口显示
                            try {
                                const { emit } = await import('@tauri-apps/api/event')
                                void emit('workflow:execute:nodeStart', { id, nodeId })
                            } catch (e) {
                                logger.add(LogType.ERR, '发射 workflow:execute:nodeStart 事件失败', e)
                            }
                        },
                        onNodeComplete: async (nodeId: string) => {
                        highlightNode(nodeId, false)
                        try {
                            const { emit } = await import('@tauri-apps/api/event')
                            void emit('workflow:execute:nodeComplete', { id, nodeId })
                        } catch (e) {
                            logger.add(LogType.ERR, '发射 workflow:execute:nodeComplete 事件失败', e)
                        }
                        },
                        onNodeError: async (nodeId: string, error: any) => {
                            highlightNode(nodeId, false)
                            try {
                                const { emit } = await import('@tauri-apps/api/event')
                                void emit('workflow:execute:nodeError', { id, nodeId, error: String(error) })
                            } catch (e) {
                                logger.add(LogType.ERR, '发射 workflow:execute:nodeError 事件失败', e)
                            }
                        },
                        onWorkflowComplete: async (workflowResult: any) => {
                            try {
                                const { emit } = await import('@tauri-apps/api/event')
                                void emit('workflow:execute:complete', { id, success: !!workflowResult.success, logs: workflowResult.logs })
                            } catch (e) {
                                logger.add(LogType.ERR, '发射 workflow:execute:complete 事件失败', e)
                            }
                            // 清理高亮
                            for (const n of nodes.value) updateNode(n.id, { class: '' })
                        }
                    })
                } catch (e) {
                    logger.add(LogType.ERR, '编辑器内执行失败', e)
                }
            })
            // 监听节点开始
            backend.addListener('workflow:execute:nodeStart', (evt: any) => {
                const payload = evt?.payload || {}
                if (payload.id !== workflowInfo.value.id) return
                const nodeId = payload.nodeId
                highlightNode(nodeId, true)
                // try {
                //     const node = (nodes.value as any[]).find((n: any) => n.id === nodeId) as any
                //     if (node && node.position) {
                //         const { zoom } = getViewport()
                //         setCenter(node.position.x + 240, node.position.y + 100, { zoom, duration: 200 })
                //     }
                // } catch (e) {
                //     // ignore
                // }
            })

            // 监听节点完成
            backend.addListener('workflow:execute:nodeComplete', (evt: any) => {
                const payload = evt?.payload || {}
                if (payload.id !== workflowInfo.value.id) return
                const nodeId = payload.nodeId
                highlightNode(nodeId, false)
            })

            // 监听节点错误
            backend.addListener('workflow:execute:nodeError', (evt: any) => {
                const payload = evt?.payload || {}
                if (payload.id !== workflowInfo.value.id) return
                const nodeId = payload.nodeId
                highlightNode(nodeId, false)
                toast.error(`节点执行错误: ${payload.error || ''}`)
            })

            // 监听执行开始/完成
            backend.addListener('workflow:execute:start', (evt: any) => {
                const payload = evt?.payload || {}
                if (payload.id !== workflowInfo.value.id) return
                toast.info('工作流开始执行')
            })
        }
    } catch (e) {
        logger.add(LogType.ERR, '注册执行可视化事件监听失败', e)
    }
})



// 搜索关键词
const searchKeyword = ref('')

// 分类中文映射
const categoryNames: Record<string, string> = {
    input: '输入',
    output: '输出',
    transform: '转换',
    control: '控制',
    logic: '逻辑',
    data: '数据',
    network: '网络',
    bot: '机器人',
    flow: '流程',
    custom: '自定义'
}

// 过滤后的节点列表
const filteredNodes = computed(() => {
    const keyword = searchKeyword.value.toLowerCase().trim()
    if (!keyword) {
        return nodeManager.getNodeList()
    }

    return nodeManager.getNodeList().filter(node => {
        // 搜索节点名称、描述和分类
        return (
            node.name.toLowerCase().includes(keyword) ||
            node.description.toLowerCase().includes(keyword) ||
            node.category.toLowerCase().includes(keyword)
        )
    })
})

// 节点和边数据
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])

// 当前选中节点（Vue Flow 在被选中时会在节点对象上标记 selected）
const selectedNode = computed(() => {
    return (nodes.value as any[]).find(n => (n as any).selected) as (Node & { data?: any }) | undefined
})

// 计算当前选中节点的可用输入（来自上游节点的 outputSchema）
const selectedNodeInputs = computed(() => {
    const res: Array<{ label: string; key: string; type?: string }> = []
    const node = selectedNode.value
    if (!node) return res

    const current = findNode(node.id)
    if (!current) return res

    const incomers = getIncomers(current)
    for (const incomer of incomers) {
        const metadata = incomer.data?.metadata
        if (metadata?.outputSchema && Array.isArray(metadata.outputSchema)) {
            for (const f of metadata.outputSchema) {
                res.push({ label: `${incomer.data?.label || incomer.id}.${f.label}`, key: `${incomer.id}.${f.key}`, type: f.type })
            }
        }
    }

    return res
})

// 计算当前选中节点的输出 schema（来自节点自身的 metadata.outputSchema 或 data.metadata）
const selectedNodeOutputs = computed(() => {
    const node = selectedNode.value
    if (!node) return [] as Array<{ key: string; label: string; type?: string }>
    const meta = node.data?.metadata
    if (!meta) return []
    if (!meta.outputSchema || !Array.isArray(meta.outputSchema)) return []
    return meta.outputSchema.map((f: any) => ({ key: f.key, label: f.label || f.key, type: f.type }))
})

const selectedNodeInputsText = computed(() => selectedNodeInputs.value.map((i: any) => `${i.label} : ${i.type || 'any'}`).join('\n'))
const selectedNodeOutputsText = computed(() => selectedNodeOutputs.value.map((o: any) => `${o.label} : ${o.type || 'any'}`).join('\n'))

// 本地编辑选中节点的参数（用于右侧面板快速编辑）
const editingNodeParams = ref<Record<string, any>>({})

// 当选中节点变化，同步本地参数副本
watch(selectedNode, (node) => {
    if (node && node.data && node.data.params) {
        editingNodeParams.value = { ...(node.data.params || {}) }
    } else {
        editingNodeParams.value = {}
    }
})

// 聚焦到节点位置
function focusOnNode(node: any) {
    if (!node || !node.position) return
    const { zoom } = getViewport()
    setCenter(node.position.x + 240, node.position.y + 100, { zoom, duration: 300 })
}

// 节点 ID 计数器
let nodeIdCounter = 0

/**
 * 更新节点 ID 计数器
 * 确保新节点 ID 不会与现有节点冲突
 */
function updateNodeIdCounter() {
    let maxId = 0
    nodes.value.forEach(node => {
        // 提取节点 ID 中的数字部分
        const match = node.id.match(/^node-(\d+)$/)
        if (match) {
            const id = parseInt(match[1])
            if (id > maxId) {
                maxId = id
            }
        }
    })
    // 设置计数器为最大值 + 1
    nodeIdCounter = maxId + 1
}

// 拖拽状态
const draggedNodeType = ref<NodeMetadata | null>(null)

/**
 * 处理拖拽开始
 */
function onDragStart(event: DragEvent, nodeType: NodeMetadata) {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('application/vueflow', nodeType.id)
        draggedNodeType.value = nodeType
    }
}

/**
 * 处理拖拽经过画布
 */
function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
    }
}

/**
 * 处理放置节点
 */
function onDrop(event: DragEvent) {
    if (!draggedNodeType.value) return

    // 获取鼠标在画布上的位置
    const position = project({
        x: event.clientX,
        y: event.clientY
    })

    // 判断节点类型,特殊节点使用自定义类型
    let nodeType = 'base'
    if (draggedNodeType.value.id === 'note') {
        nodeType = 'note'
    } else if (draggedNodeType.value.id === 'if-else') {
        nodeType = 'ifelse'
    }

    // 创建新节点
    const newNode: Node = {
        id: `node-${nodeIdCounter++}`,
        type: nodeType,
        position,
        data: {
            label: draggedNodeType.value.name,
            nodeType: draggedNodeType.value.id,
            metadata: draggedNodeType.value,
            params: {}
        }
    }

    // 添加节点到画布
    addNodes([newNode])

    // 清除拖拽状态
    draggedNodeType.value = null
}

/**
 * 计算两个节点的重叠区域和推开方向
 */
function calculatePushDirection(draggedNode: Node, intersectingNode: Node) {
    // 安全地获取节点尺寸，使用类型断言
    const draggedDimensions = (draggedNode as any).dimensions || { width: 150, height: 50 }
    const intersectingDimensions = (intersectingNode as any).dimensions || { width: 150, height: 50 }

    const draggedCenter = {
        x: draggedNode.position.x + draggedDimensions.width / 2,
        y: draggedNode.position.y + draggedDimensions.height / 2,
    }

    const intersectingCenter = {
        x: intersectingNode.position.x + intersectingDimensions.width / 2,
        y: intersectingNode.position.y + intersectingDimensions.height / 2,
    }

    // 计算从被拖拽节点到重叠节点的方向向量
    const dx = intersectingCenter.x - draggedCenter.x
    const dy = intersectingCenter.y - draggedCenter.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0) {
        // 如果完全重叠，默认向右下推
        return { x: 1, y: 1 }
    }

    // 归一化方向向量
    return {
        x: dx / distance,
        y: dy / distance,
    }
}

/**
 * 处理节点拖拽时的重叠检测和推开
 */
onNodeDrag(({ node: draggedNode }) => {
    return // 设置功能还没完成，暂时禁用
    // eslint-disable-next-line no-unreachable
    const intersections = getIntersectingNodes(draggedNode)

    if (intersections.length > 0) {
        // 对每个重叠的节点进行推开
        for (const intersectingNode of intersections) {
            // 跳过被拖拽的节点本身
            if (intersectingNode.id === draggedNode.id) continue

            const direction = calculatePushDirection(draggedNode, intersectingNode)

            // 计算推开的距离（节点宽度 + 一些间距）
            const pushDistance = 30

            // 计算新位置
            const newPosition = {
                x: intersectingNode.position.x + direction.x * pushDistance,
                y: intersectingNode.position.y + direction.y * pushDistance,
            }

            // 更新节点位置
            updateNode(intersectingNode.id, {
                position: newPosition,
            })
        }
    }
})

/**
 * 处理连接事件
 */
function onConnect(params: any) {
  const targetAlreadyConnected = edges.value.some(
    e => e.target === params.target
  )

  if (targetAlreadyConnected) {
    logger.add(LogType.ERR, `节点 ${params.target} 已经有输入连接`)
    return
  }

  const data = {} as {[key: string]: any}

  addEdges([
    {
      ...params,
      data: data,
      type: 'base',
    },
  ])
}

/**
 * 处理边双击事件，删除边
 */
function onEdgeDoubleClick({ edge }: { edge: Edge }) {
    edges.value = edges.value.filter(e => e.id !== edge.id)
}
</script>

<style scoped>
.edit-view {
    background-color: rgba(var(--color-bg-rgb), 0.8);
    width: 100%;
    height: 100vh;
    position: relative;
}

.toolbar {
    width: fit-content;
    position: absolute;
    bottom: 15px;
    left: calc(50% - 120px);
    transform: translateX(-50%);
    height: 50px;
    background: rgba(var(--color-card-rgb), 0.8);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 10;
    display: flex;
    align-items: center;
    padding: 0 5px;
    justify-content: space-between;
}

.toolbar-btn {
    background: var(--color-card-2);
    margin: 5px;
    color: var(--color-font);
    transition: all 0.3s;
    align-items: center;
    border-radius: 7px;
    font-size: 0.7rem;
    padding: 8px 15px;
    cursor: pointer;
    display: flex;
    border: none;
    gap: 6px;
}

.toolbar-btn:hover {
    background: var(--color-card-1);
    color: var(--color-font);
}

.toolbar-btn:active {
    transform: scale(0.95);
}

.toolbar-btn svg {
    width: 14px;
    height: 14px;
}

.execute-btn {
    background: var(--color-main);
    color: var(--color-font-r);
}

.execute-btn:hover:not(:disabled) {
    opacity: 0.9;
}

.execute-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 模态对话框 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(var(--color-bg-rgb), 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-dialog {
    background: rgba(var(--color-card-rgb), 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;box-shadow:0 0 5px var(--color-shader);
    max-width: 450px;
    width: 90%;
}

/* Modal 进入和退出动画 */
.modal-enter-active {
    transition: opacity 0.2s ease-out;
}

.modal-leave-active {
    transition: opacity 0.2s ease-in;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-dialog {
    animation: slideUp 0.3s ease-out;
}

.modal-leave-active .modal-dialog {
    animation: slideDown 0.2s ease-in;
}

@keyframes slideUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

@keyframes slideDown {
    from {
        transform: translateY(0);
        opacity: 1;
    }
    to {
        transform: translateY(20px);
        opacity: 0;
    }
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid rgba(var(--color-font-rgb), 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.modal-header h3 {
    margin: 0;
    color: var(--color-font);
    font-size: 1.1rem;
    font-weight: 600;
}

.modal-close {
    background: transparent;
    border: none;
    color: var(--color-font-2);
    cursor: pointer;
    padding: 4px;
    font-size: 1.2rem;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    color: var(--color-font);
}

.modal-body {
    padding: 24px;
}

.modal-body p {
    margin: 0 0 12px 0;
    color: var(--color-font);
    font-size: 0.95rem;
    line-height: 1.6;
}

.modal-hint {
    color: var(--color-font-2);
    font-size: 0.85rem !important;
}

.modal-footer {
    padding: 16px 24px;
    border-top: 1px solid rgba(var(--color-font-rgb), 0.1);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.modal-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.modal-btn-cancel {
    background: rgba(var(--color-font-rgb), 0.1);
    color: var(--color-font);
}

.modal-btn-cancel:hover {
    background: rgba(var(--color-font-rgb), 0.15);
}

.modal-btn-confirm {
    background: var(--color-main);
    color: var(--color-font-r);
}

.modal-btn-confirm:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.node-list {
    background: rgba(var(--color-card-rgb), 0.5);
    box-shadow: 0 0 5px var(--color-shader);
    backdrop-filter: blur(10px);
    height: calc(100vh - 60px);
    position: absolute;
    width: 200px;
    right: 10px;
    z-index: 10;
    top: 10px;
}

:deep(.vue-flow__node) {
    transition: transform 0.3s ease-out;
}

:deep(.vue-flow__node.dragging) {
    transition: none;
}

/* 执行中的节点高亮样式 */
:deep(.vue-flow__node.executing > div.ss-card) {
    outline: 2px solid var(--color-main);
}

.node-list-search {
    background: rgba(var(--color-card-2-rgb), 0.8);
    border-radius: 99px;
}
.node-list-search svg {
    color: var(--color-font-1);
    margin-left: 10px;
    margin-top: 6px;
    width: 14px;
}
.node-list-search input {
    color: var(--color-font);
    width: calc(100% - 40px);
    background: transparent;
    margin-left: 10px;
    outline: none;
    height: 25px;
    border: none;
}

.node-list-body {
    margin-top: 15px;
}
.node-list-body > div {
    background: rgba(var(--color-card-2-rgb), 0.8);
    transition: background 0.3s, transform 0.2s;
    margin-top: 5px;
    border-radius: 7px;
    user-select: none;
    cursor: grab;
    padding: 10px;
    display: flex;
}
.node-list-body > div:hover {
    background: rgba(var(--color-card-2-rgb), 0.5);
}
.node-list-body > div:active {
    cursor: grabbing;
    opacity: 0.6;
}
.node-list-body > div svg {
    color: var(--color-font-1);
    margin-top: 2px;
    height: 0.9rem;
    width: 0.9rem;
}
.node-list-body > div div {
    flex-direction: column;
    align-items: start;
    margin-left: 10px;
    display: flex;
}
.node-list-body > div div > span {
    color: var(--color-font);
    font-weight: bold;
    font-size: 0.8rem;
}
.node-list-body > div div > span > span {
    background: var(--color-main);
    color: var(--color-font-r);
    border-radius: 99px;
    padding: 1px 5px;
    margin-right: 5px;
    font-size: calc(0.8rem - 2px);
}
.node-list-body > div div a {
    font-size: 0.75rem;
    color: var(--color-font-2);
}

.flow-info-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: var(--color-font);
    background: rgba(var(--color-card-2-rgb), 0.8);
    padding: 10px;
    border-radius: 7px;
    margin-top: 10px;
}
.flow-info-card header {
    font-size: 0.9rem;
    font-weight: 600;
    border-bottom: 1px solid var(--color-shader);
    padding-bottom: 6px;
}

.flow-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.flow-row label {
    font-size: 0.75rem;
    color: var(--color-font-2);
}
.flow-value {
    text-align: right;
    flex: 1;
    font-size: 0.8rem;
    color: var(--color-font);
    word-break: break-word;
}
.flow-value.param-preview {
    background: rgba(var(--color-card-1-rgb), 0.7);
    overflow-x: scroll;
    overflow-y: hidden;
    border-radius: 7px;
    text-align: left;
    padding: 10px;
    min-width: calc(100% - 20px);
    font-size: 0.7rem;
}
.flow-value.param-preview::-webkit-scrollbar {
    height: 6px;
}
.flow-value.param-preview pre {
    margin: 0;
}
.flow-desc {
    max-height: 48px;
    overflow: hidden;
}
.flow-actions {
    border-radius: 7px;
    padding: 5px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin: 6px -5px 0 -5px;
}
.flow-actions .edit-btn,
.flow-actions .save-btn,
.flow-actions .cancel-btn {
    padding: 6px 10px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
}
.flow-actions .edit-btn { background: var(--color-card-1); }
.flow-actions .save-btn { background: var(--color-main); color: var(--color-font-r); }
.flow-actions .cancel-btn { background: var(--color-card-1); }
</style>

.selected-node-card {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px dashed rgba(var(--color-font-rgb), 0.06);
}
.param-preview pre {
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 120px;
    overflow: auto;
    background: rgba(var(--color-card-2-rgb), 0.05);
    padding: 8px;
    border-radius: 6px;
}
.param-edit .param-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 8px;
}
.param-edit input {
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid rgba(var(--color-font-rgb), 0.06);
}
<style>
.node-list .tab-bar {
    --bc-tab-margin: 10px;
}
.node-list .tab-main > div:first-child {
    background: transparent;
    box-shadow: unset;
}
</style>
