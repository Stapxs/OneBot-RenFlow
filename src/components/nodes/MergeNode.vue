<script setup lang="ts">
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { NodeParam } from 'renflow.runner'
import { ref, computed, watch } from 'vue'
import NodeSettingsPanel from '../NodeSettingsPanel.vue'

const props = defineProps<NodeProps>()

const { updateNode } = useVueFlow()

// 节点参数值：优先从节点 data.params 恢复已保存的值
const paramValues = ref<Record<string, any>>({ ...(props.data?.params || {}) })


// 设置面板显示状态
const showSettingsPanel = ref(false)

// 从 metadata 获取参数配置
const params = computed<NodeParam[]>(() => {
    return props.data?.metadata?.params || []
})

// 初始化参数默认值（在已有保存值的基础上填充缺省值）
const initParamDefaults = () => {
    params.value.forEach(param => {
        if (param.defaultValue !== undefined && paramValues.value[param.key] === undefined) {
            paramValues.value[param.key] = param.defaultValue
        }
    })
}

// 首次填充默认值
initParamDefaults()

// 如果外部节点 data.params 发生变化（例如从存储加载），同步到本地 paramValues
watch(() => props.data?.params, (newVal) => {
    paramValues.value = { ...(newVal || {}) }
    initParamDefaults()
}, { deep: true })

// 更新节点数据的辅助函数
const updateNodeData = (newParams: Record<string, any>) => {
    updateNode(props.id, {
        data: {
            ...props.data,
            params: { ...newParams }
        }
    })
}

// 打开设置面板
const openSettings = () => {
    showSettingsPanel.value = true
}

// 关闭设置面板
const closeSettings = () => {
    showSettingsPanel.value = false
}

// 更新设置
const updateSettings = (newValues: Record<string, any>) => {
    paramValues.value = { ...newValues }
    updateNodeData(paramValues.value)
}

defineEmits(['updateNodeInternals'])
</script>

<template>
    <Handle type="target" :position="Position.Left" />

    <div class="merge-node">
        <button @click="openSettings">
            <font-awesome-icon :icon="['fas', 'gear']" />
        </button>
    </div>

    <Handle type="source" :position="Position.Right" />

    <!-- 设置面板弹窗 -->
    <NodeSettingsPanel
        v-model="paramValues"
        :pan-show="showSettingsPanel"
        :params="params"
        :node-id="props.id"
        :node-name="data.label"
        @update:model-value="updateSettings"
        @close="closeSettings" />
</template>
<style scoped>
.merge-node {
    box-shadow: 0 0 5px var(--color-shader);
    background: var(--color-card);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 45px;
    width: 45px;
}
.merge-node button {
    background: transparent;
    border: none;
    cursor: pointer;
}
.merge-node button > svg {
    color: var(--color-main);
    font-size: 0.9rem;
}
</style>
