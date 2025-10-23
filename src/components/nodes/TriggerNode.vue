<script setup lang="ts">
import { Position, Handle } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

// 从 data 中获取触发信息
const triggerType = props.data?.triggerType || '事件'
const triggerName = props.data?.triggerName || ''

defineEmits(['updateNodeInternals'])
</script>

<template>
    <div class="trigger-node">
        <div class="trigger-type">{{ triggerType }}</div>
        <div class="trigger-name">{{ triggerName }}</div>
    </div>

    <Handle type="source" :position="Position.Right" />
</template>

<style scoped>
.trigger-node {
    background: var(--color-card);
    border-radius: 12px;
    padding: 12px 20px;
    box-shadow: 0 0 5px var(--color-shader);
    min-width: 150px;
    text-align: center;
}

.trigger-type {
    font-size: 0.75rem;
    opacity: 0.9;
    margin-bottom: 4px;
}

.trigger-name {
    border-top: 1px solid var(--color-card-2);
    font-size: 0.9rem;
    font-weight: bold;
}
</style>
