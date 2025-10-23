<template>
    <div class="edit-view">
        <VueFlow v-model:nodes="nodes" v-model:edges="edges"
            @connect="onConnect"
            @edgeDoubleClick="onEdgeDoubleClick">
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
                            <input type="text" placeholder="搜索分类或名称……" />
                        </label>
                    </div>
                    <div class="node-list-body">
                        <div v-for="item in nodeManager.getNodeList()" :key="item.id"
                            :draggable="true">
                            <font-awesome-icon :icon="['fas', item.icon || 'fa-cube']" />
                            <div>
                                <span>{{ item.name }}</span>
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

import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Background } from '@vue-flow/background'

import BcTab from 'vue3-bcui/packages/bc-tab'

import BaseNode from '@app/components/BaseNode.vue'
import BaseEdge from '@app/components/BaseEdge.vue'

const { onNodeDrag, getIntersectingNodes, updateNode, addEdges } = useVueFlow()
const nodeManager = new NodeManager()

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

function onConnect(params: any) {
  const targetAlreadyConnected = edges.value.some(
    e => e.target === params.target
  )

  if (targetAlreadyConnected) {
    console.warn(`节点 ${params.target} 已经有输入连接`)
    return
  }

  addEdges([
    {
      ...params,
      data: { label: `${params.source} → ${params.target}` },
      type: 'base',
    },
  ])
}

function onEdgeDoubleClick({ edge }: { edge: Edge }) {
    edges.value = edges.value.filter(e => e.id !== edge.id)
}

const nodes = ref<Node[]>([
    {
        id: '1',
        type: 'base',
        position: { x: 250, y: 0 },
        data: { label: 'Node 1', type: 'start' },
    },
    {
        id: '2',
        type: 'base',
        position: { x: 450, y: 0 },
        data: { label: 'Node 2' },
    },
    {
        id: '3',
        type: 'base',
        position: { x: 450, y: 120 },
        data: { label: 'Node 3' },
    },
    {
        id: '4',
        type: 'base',
        position: { x: 650, y: 0 },
        data: { label: 'Node 4' },
    },
    {
        id: '5',
        type: 'base',
        position: { x: 650, y: 120 },
        data: { label: 'Node 5', type: 'end' },
    },
])

// these are our edges
const edges = ref<Edge[]>([])
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
    transition: background 0.3s;
    border-radius: 7px;
    user-select: none;
    cursor: pointer;
    padding: 10px;
    display: flex;
}
.node-list-body > div:hover {
    background: rgba(var(--color-card-2-rgb), 0.5);
}
.node-list-body > div div {
    flex-direction: column;
    align-items: start;
    margin-left: 10px;
    display: flex;
}
.node-list-body > div div span {
    color: var(--color-font);
    font-weight: bold;
    font-size: 0.8rem;
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
