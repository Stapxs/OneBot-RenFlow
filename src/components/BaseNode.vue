<script setup lang="ts">
import { Position, Handle } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
const isDev = import.meta.env.DEV

defineEmits(['updateNodeInternals'])
</script>

<template>
    <Handle v-if="data.type != 'start'" type="target" :position="Position.Left" />

    <div class="vue-flow__node-base ss-card">
        <header v-if="data.data">{{ data.label }}</header>
        <div v-else>{{ data.label }}</div>

        <div class="node-pos" v-if="isDev">
            <span>({{ Math.round(props.position.x) }}, {{ Math.round(props.position.y) }})</span>
        </div>
    </div>

    <Handle v-if="data.type != 'end'" type="source" :position="Position.Right" />
</template>

<style scoped>
.vue-flow__node-base {
    box-shadow: 0 0 5px var(--color-shader);
    min-height: unset;
    font-size: 0.8rem;
    padding: 15px 20px;
}

.vue-flow__node.selectable:focus .vue-flow__node-base {
    box-shadow: 0 0 5px var(--color-main);
}

.vue-flow__node-base header {
    background: var(--color-main);
    color: var(--color-font-r);
    margin: -8px -13px;
    border-radius: 7px;
    padding: 3px 5px;
    letter-spacing: 0;
    font-weight: bold;
    font-size: 0.8rem;
    margin-bottom: 0;
}
.node-pos {
    transform: translateY(50%);
    justify-content: center;
    position: absolute;
    font-size: 0.6rem;
    display: flex;
    width: 100%;
    bottom: 0;
    left: 0;
}
.node-pos span {
    background: var(--color-main);
    color: var(--color-font-r);
    border-radius: 7px;
    padding: 3px 5px;
}
</style>
