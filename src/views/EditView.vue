<template>
    <div class="edit-view" @drop="onDrop">
        <!-- 工具栏 -->
        <div class="toolbar">
            <button class="toolbar-btn save-btn" @click="saveWorkflow">
                <font-awesome-icon :icon="['fas', 'fa-floppy-disk']" />
                保存
            </button>
            <button class="toolbar-btn" @click="handleLoadClick">
                <font-awesome-icon :icon="['fas', 'fa-folder-open']" />
                加载
            </button>
            <button class="toolbar-btn" @click="exportExecutionData">
                <font-awesome-icon :icon="['fas', 'fa-file-export']" />
                导出执行数据
            </button>
            <button class="toolbar-btn execute-btn" :disabled="isExecuting" @click="executeWorkflow">
                <font-awesome-icon :icon="['fas', isExecuting ? 'fa-spinner' : 'fa-play']" :spin="isExecuting" />
                {{ isExecuting ? '执行中...' : '执行流程' }}
            </button>
        </div>

        <!-- 加载确认对话框 -->
        <Transition name="modal">
            <div v-if="showLoadConfirmDialog" class="modal-overlay" @click="showLoadConfirmDialog = false">
                <div class="modal-dialog" @click.stop>
                    <div class="modal-header">
                        <h3>确认加载</h3>
                        <button class="modal-close" @click="showLoadConfirmDialog = false">
                            <font-awesome-icon :icon="['fas', 'fa-xmark']" />
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>加载工作流将会覆盖当前的编辑内容，是否继续？</p>
                        <p class="modal-hint">建议先保存当前工作流再加载其他工作流</p>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-cancel" @click="showLoadConfirmDialog = false">
                            取消
                        </button>
                        <button class="modal-btn modal-btn-confirm" @click="confirmLoad">
                            确认加载
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

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
                <div icon="fa-info-circle">
                    2
                </div>
            </BcTab>
        </div>
    </div>
</template>

<script setup lang="ts">
import { LogLevel, init, nodeManager as runnerNodeManager, WorkflowConverter, WorkflowEngine } from 'renflow.runner'

import type { NodeMetadata, VueFlowWorkflow } from 'renflow.runner'
import type { Node, Edge } from '@vue-flow/core'

import { ref, computed, onMounted } from 'vue'
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
import type { WorkflowData } from '@app/functions/workflow'
import { toast } from '@app/functions/toast'
import { Logger, LogType } from '@app/functions/base'

const route = useRoute()
const {
    onNodeDrag,
    getIntersectingNodes,
    updateNode,
    addEdges,
    addNodes,
    project,
    setCenter,
    getViewport,
    fitView
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
const workflowEngine = new WorkflowEngine()

// 执行状态
const isExecuting = ref(false)
const executingNodeId = ref<string | null>(null)

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

// 显示加载对话框
const showLoadDialog = ref(false)

// 显示加载确认对话框
const showLoadConfirmDialog = ref(false)

// 从 URL 参数获取工作流信息
onMounted(async () => {
    const query = route.query
    if (query.triggerType && query.triggerName && query.name) {
        workflowInfo.value = {
            id: query.id as string | undefined,
            triggerType: query.triggerType as string,
            triggerTypeLabel: query.triggerTypeLabel as string || query.triggerType as string,
            triggerName: query.triggerName as string,
            triggerLabel: query.triggerLabel as string || query.triggerName as string,
            name: query.name as string,
            description: (query.description as string) || ''
        }

        logger.add(LogType.INFO, '工作流信息:', workflowInfo.value)

        // 如果有 ID，尝试加载工作流
        if (query.id) {
            await loadWorkflowById(query.id as string)
        } else {
            // 创建触发器节点
            nodes.value = [{
                id: 'node-trigger',
                type: 'trigger',
                position: { x: 0, y: 0 },
                data: {
                    triggerType: workflowInfo.value.triggerTypeLabel,
                    triggerName: workflowInfo.value.triggerLabel
                }
            }]
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
            nodes: JSON.parse(JSON.stringify(nodes.value)), // 深拷贝确保数据完整
            edges: JSON.parse(JSON.stringify(edges.value))
        }

        const saved = await WorkflowStorage.save(workflowData)
        workflowInfo.value.id = saved.id

        // 使用 Toast 通知
        toast.success(`工作流已保存: ${saved.name}`)
        logger.add(LogType.INFO, '工作流已保存:', saved)
    } catch (error) {
        toast.error('保存工作流失败')
        logger.error(error as unknown as Error, '保存工作流失败')
    }
}

/**
 * 显示加载确认对话框
 */
function handleLoadClick() {
    if (nodes.value.length > 1 || edges.value.length > 0) {
        // 如果有未保存的内容，显示确认对话框
        showLoadConfirmDialog.value = true
    } else {
        // 直接显示加载对话框
        showLoadDialog.value = true
    }
}

/**
 * 确认加载
 */
function confirmLoad() {
    showLoadConfirmDialog.value = false
    showLoadDialog.value = true
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
 * 导出执行数据
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
        toast.error('导出执行数据失败')
        logger.error(error as unknown as Error, '导出执行数据失败')
    }
}

/**
 * 执行工作流
 */
async function executeWorkflow() {
    try {
        // 检查是否有节点
        if (nodes.value.length === 0) {
            toast.error('当前工作流为空，无法执行')
            return
        }

        isExecuting.value = true
        executingNodeId.value = null

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
            isExecuting.value = false
            return
        }

        toast.success('开始执行工作流')
        logger.add(LogType.INFO, '开始执行工作流:', executionData)

        // 执行工作流（带回调和延迟）
        fitView({ duration: 300 })
        const result = await workflowEngine.execute(executionData, null, {
            minDelay: 500, // 前端模式最少 0.5s 延迟
            timeout: 60000, // 60 秒超时
            callback: {
                onNodeStart: async (nodeId) => {
                    executingNodeId.value = nodeId
                    highlightNode(nodeId, true)
                    // 视图跟随执行中的节点
                    let { zoom } = getViewport()
                    const node = (nodes.value as any[]).find((n: any) => n.id === nodeId) as any
                    if (node && node.position) {
                        setCenter(
                            node.position.x + 240,
                            node.position.y + 100,
                            { zoom: zoom, duration: 200, interpolate: 'linear' }
                        )
                    }
                },
                onNodeComplete: async (nodeId) => {
                    highlightNode(nodeId, false)
                },
                onNodeError: async (nodeId, error) => {
                    logger.add(LogType.ERR, `节点执行失败: ${nodeId}`, error)
                    highlightNode(nodeId, false)
                    toast.error(`节点执行失败: ${error.message}`)
                },
                onWorkflowComplete: async (workflowResult) => {
                    logger.add(LogType.INFO, '工作流执行完成:', workflowResult)
                    executingNodeId.value = null

                    if (workflowResult.success) {
                        toast.success('工作流执行成功')
                        logger.add(LogType.INFO, '执行日志:', workflowResult.logs)
                    } else {
                        toast.error(`工作流执行失败: ${workflowResult.error}`)
                    }
                }
            }
        })

        logger.add(LogType.INFO, '最终结果:', result)
    } catch (error) {
        toast.error('执行工作流失败')
        logger.error(error as unknown as Error, '执行工作流失败')
    } finally {
        isExecuting.value = false
        executingNodeId.value = null
    }
}

/**
 * 高亮节点
 */
function highlightNode(nodeId: string, highlight: boolean) {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node) {
        updateNode(nodeId, {
            class: highlight ? 'executing' : ''
        })
    }
}

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
    background-color: var(--color-bg);
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
</style>
<style>
.node-list .tab-bar {
    --bc-tab-margin: 10px;
}
.node-list .tab-main > div:first-child {
    background: transparent;
    box-shadow: unset;
}
</style>
