<script setup lang="ts">
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { NodeParam } from '@app/functions/nodes/types'
import { ref, computed } from 'vue'
import NodeSettingsPanel from './NodeSettingsPanel.vue'

const props = defineProps<NodeProps>()
const isDev = import.meta.env.DEV

const { removeNodes } = useVueFlow()

// 节点参数值
const paramValues = ref<Record<string, any>>({})

// 设置面板显示状态
const showSettingsPanel = ref(false)

// 从 metadata 获取参数配置
const params = computed<NodeParam[]>(() => {
    return props.data?.metadata?.params || []
})

// 判断是否需要显示设置按钮
// 1. 参数超过3个
// 2. 包含 settings 类型的参数
const shouldShowSettings = computed(() => {
    const paramList = params.value.filter(p => p.type !== 'settings')
    return paramList.length > 3 || params.value.some(p => p.type === 'settings')
})

// 显示在节点上的参数（如果有设置按钮则不显示参数）
const displayParams = computed(() => {
    if (shouldShowSettings.value) {
        return []
    }
    return params.value.filter(p => p.type !== 'settings')
})

// 设置面板中的参数（排除 settings 类型）
const settingsParams = computed(() => {
    return params.value.filter(p => p.type !== 'settings')
})

// 初始化参数默认值
params.value.forEach(param => {
    if (param.defaultValue !== undefined && paramValues.value[param.key] === undefined) {
        paramValues.value[param.key] = param.defaultValue
    }
})

// 更新参数值
const updateParam = (key: string, value: any) => {
    paramValues.value[key] = value
    // 更新节点 data 中的参数
    if (props.data) {
        props.data.params = { ...paramValues.value }
    }
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
    if (props.data) {
        props.data.params = { ...paramValues.value }
    }
}

// 删除节点
const deleteNode = () => {
    removeNodes([props.id])
}

defineEmits(['updateNodeInternals'])
</script>

<template>
    <Handle v-if="data.type != 'start'" type="target" :position="Position.Left" />

    <div class="vue-flow__node-base ss-card">
        <header v-if="data.metadata">
            <div class="node-title">
                <font-awesome-icon :icon="['fas', data.metadata.icon || 'fa-cube']" />
                <span class="node-label">{{ data.label }}</span>
            </div>
            <button class="delete-btn" @click.stop="deleteNode" title="删除节点">
                <font-awesome-icon :icon="['fas', 'times']" />
            </button>
        </header>
        <div v-else>{{ data.label }}</div>

        <!-- 设置按钮 -->
        <div class="node-settings-btn" v-if="shouldShowSettings">
            <button @click.stop="openSettings" title="节点设置">
                <span>节点设置</span>
                <font-awesome-icon :icon="['fas', 'cog']" />
            </button>
        </div>

        <!-- 参数列表 -->
        <div class="node-params" v-if="displayParams.length > 0">
            <div class="param-item" v-for="param in displayParams" :key="param.key">
                <label v-if="param.type != 'switch'" :class="{ required: param.required }">
                    {{ param.label }}
                </label>

                <!-- input 类型 -->
                <input
                    v-if="param.type === 'input'"
                    type="text"
                    :placeholder="param.placeholder"
                    :value="paramValues[param.key]"
                    @input="updateParam(param.key, ($event.target as HTMLInputElement).value)"
                    @mousedown.stop
                    @pointerdown.stop
                />

                <!-- number 类型 -->
                <input
                    v-else-if="param.type === 'number'"
                    type="number"
                    :placeholder="param.placeholder"
                    :value="paramValues[param.key]"
                    @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value))"
                    @mousedown.stop
                    @pointerdown.stop
                />

                <!-- textarea 类型 -->
                <textarea
                    v-else-if="param.type === 'textarea'"
                    :placeholder="param.placeholder"
                    :value="paramValues[param.key]"
                    @input="updateParam(param.key, ($event.target as HTMLTextAreaElement).value)"
                    rows="3"
                    @mousedown.stop
                    @pointerdown.stop
                />

                <!-- select 类型 -->
                <select
                    v-else-if="param.type === 'select'"
                    :value="paramValues[param.key]"
                    @change="updateParam(param.key, ($event.target as HTMLSelectElement).value)"
                    @mousedown.stop
                    @pointerdown.stop
                >
                    <option v-for="option in param.options" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>

                <!-- switch 类型 -->
                 <div v-else-if="param.type === 'switch'" class="switch-container">
                    <label :class="{ required: param.required }">
                        {{ param.label }}
                    </label>
                    <label class="ss-switch" @mousedown.stop @pointerdown.stop>
                        <input v-model="paramValues[param.key]"
                            type="checkbox"
                            @change="updateParam(param.key, ($event.target as HTMLInputElement).checked)">
                        <div>
                            <div />
                        </div>
                    </label>
                 </div>
            </div>
        </div>

        <div class="node-pos" v-if="isDev">
            <span>({{ Math.round(props.position.x) }}, {{ Math.round(props.position.y) }})</span>
        </div>
    </div>

    <Handle v-if="data.type != 'end'" type="source" :position="Position.Right" />

    <!-- 设置面板弹窗 -->
    <NodeSettingsPanel
        v-if="showSettingsPanel"
        :params="settingsParams"
        v-model="paramValues"
        @update:modelValue="updateSettings"
        @close="closeSettings"
    />
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
    padding: 3px 5px 3px 10px;
    letter-spacing: 0;
    font-weight: bold;
    font-size: 0.8rem;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.vue-flow__node-base header .node-title {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.vue-flow__node-base header .node-title svg {
    flex-shrink: 0;
}

.vue-flow__node-base header .node-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.vue-flow__node-base header svg {
    width: 12px;
    height: 12px;
}

/* 删除按钮 */
.delete-btn {
    transition: background 0.2s, transform 0.1s;
    background: rgba(255, 255, 255, 0.15);
    color: var(--color-font-r);
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    display: flex;
    opacity: 0.7;
    border: none;
    flex-shrink: 0;
}

.delete-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.05);
    opacity: 1;
}

.delete-btn:active {
    transform: scale(0.95);
}

.delete-btn svg {
    height: 10px;
    width: 10px;
}

/* 设置按钮 */
.node-settings-btn {
    margin-top: 8px;
}

.node-settings-btn button {
    width: 100%;
    background: rgba(var(--color-main-rgb), 0.1);
    border: 1px solid rgba(var(--color-main-rgb), 0.3);
    border-radius: 6px;
    padding: 0;
    color: var(--color-font);
    font-size: 0.8rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    transition: background 0.2s, border-color 0.2s, transform 0.1s;
}

.node-settings-btn button span {
    text-align: left;
    min-width: 140px;
    flex: 1;
}

.node-settings-btn button:hover {
    background: rgba(var(--color-main-rgb), 0.2);
    border-color: rgba(var(--color-main-rgb), 0.5);
}

.node-settings-btn button:active {
    transform: scale(0.98);
}

.node-settings-btn svg {
    color: var(--color-font-1);
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

/* 参数区域 */
.node-params {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 5px;
}

.param-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.param-item > label,
.param-item .switch-container > label,
.node-settings-btn button {
    color: var(--color-font);
    font-size: 0.7rem;
    font-weight: 500;
}

.param-item > label.required::after {
    content: ' *';
    color: #ff4444;
}

.param-item input[type="text"],
.param-item input[type="number"],
.param-item textarea,
.param-item select {
    background: rgba(var(--color-card-2-rgb), 0.5);
    border: 1px solid rgba(var(--color-font-rgb), 0.1);
    color: var(--color-font);
    border-radius: 5px;
    padding: 0 8px;
    font-size: 0.75rem;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
}

.param-item input[type="text"]:focus,
.param-item input[type="number"]:focus,
.param-item textarea:focus,
.param-item select:focus {
    border-color: var(--color-main);
    background: rgba(var(--color-card-2-rgb), 0.8);
}

.param-item input[type="text"],
.param-item input[type="number"],
.param-item select {
    height: 25px;
}

.param-item textarea {
    resize: vertical;
    min-height: 60px;
    font-family: inherit;
}

.param-item select {
    cursor: pointer;
}

.param-item .switch-container {
    align-items: center;
    display: flex;
}
.param-item .switch-container label:first-child {
    flex: 1;
}
.param-item .ss-switch {
    --switch-dot-border: 4px;
    --switch-dot-margin: 5px;
    --switch-height: 20px;
    margin-left: 10px;
    margin-bottom: 0;
    min-width: 35px;
}
.param-item .ss-switch > div > div {
    margin-left: 1px;
    margin-top: 1px;
}
.param-item .ss-switch input:checked ~ div > div {
    border: var(--switch-dot-border) solid #fff;
    margin-left: calc(100% - var(--switch-height) + var(--switch-dot-margin) - 4px);
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
    border-radius: 99px;
    padding: 4px 7px;
}
</style>
