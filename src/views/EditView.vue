<template>
    <div class="edit-view" @drop="onDrop">
        <VueFlow v-model:nodes="nodes" v-model:edges="edges"
            @connect="onConnect"
            @edgeDoubleClick="onEdgeDoubleClick"
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
                            <input
                                type="text"
                                placeholder="搜索分类或名称……"
                                v-model="searchKeyword"
                            />
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
import { NodeManager } from '@app/functions/nodes'

import type { NodeMetadata } from '@app/functions/nodes/types'
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

const route = useRoute()
const { onNodeDrag, getIntersectingNodes, updateNode, addEdges, addNodes, project } = useVueFlow()
const nodeManager = new NodeManager()

// 是否为开发环境
const isDev = import.meta.env.DEV

// 工作流信息
const workflowInfo = ref({
    triggerType: '',
    triggerTypeLabel: '',
    triggerName: '',
    triggerLabel: '',
    name: '',
    description: ''
})

// 从 URL 参数获取工作流信息
onMounted(() => {
    const query = route.query
    if (query.triggerType && query.triggerName && query.name) {
        workflowInfo.value = {
            triggerType: query.triggerType as string,
            triggerTypeLabel: query.triggerTypeLabel as string || query.triggerType as string,
            triggerName: query.triggerName as string,
            triggerLabel: query.triggerLabel as string || query.triggerName as string,
            name: query.name as string,
            description: (query.description as string) || ''
        }
        console.log('工作流信息:', workflowInfo.value)

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

// 节点 ID 计数器
let nodeIdCounter = 0

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
    console.warn(`节点 ${params.target} 已经有输入连接`)
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
