<script setup lang="ts">
import type { NodeParam } from '@app/functions/nodes/types'
import { ref, watch } from 'vue'

interface Props {
    params: NodeParam[]
    modelValue: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    'update:modelValue': [value: Record<string, any>]
    'close': []
}>()

// 本地参数值
const localValues = ref<Record<string, any>>({ ...props.modelValue })

// 初始化参数默认值
props.params.forEach(param => {
    if (param.defaultValue !== undefined && localValues.value[param.key] === undefined) {
        localValues.value[param.key] = param.defaultValue
    }
})

// 更新参数值
const updateParam = (key: string, value: any) => {
    localValues.value[key] = value
}

// 保存设置
const saveSettings = () => {
    emit('update:modelValue', { ...localValues.value })
    emit('close')
}

// 取消设置
const cancelSettings = () => {
    emit('close')
}
</script>

<template>
    <Teleport to="body">
        <div class="node-settings-overlay" @click.self="cancelSettings">
            <div class="node-settings-panel ss-card">
                <div class="settings-header">
                    <h3>节点设置</h3>
                    <button class="close-btn" @click="cancelSettings" title="关闭">
                        <font-awesome-icon :icon="['fas', 'times']" />
                    </button>
                </div>

                <div class="settings-body">
                    <div class="param-item" v-for="param in params" :key="param.key">
                        <label v-if="param.type != 'switch'" :class="{ required: param.required }">
                            {{ param.label }}
                        </label>

                        <!-- input 类型 -->
                        <input
                            v-if="param.type === 'input'"
                            type="text"
                            :placeholder="param.placeholder"
                            :value="localValues[param.key]"
                            @input="updateParam(param.key, ($event.target as HTMLInputElement).value)"
                        />

                        <!-- number 类型 -->
                        <input
                            v-else-if="param.type === 'number'"
                            type="number"
                            :placeholder="param.placeholder"
                            :value="localValues[param.key]"
                            @input="updateParam(param.key, Number(($event.target as HTMLInputElement).value))"
                        />

                        <!-- textarea 类型 -->
                        <textarea
                            v-else-if="param.type === 'textarea'"
                            :placeholder="param.placeholder"
                            :value="localValues[param.key]"
                            @input="updateParam(param.key, ($event.target as HTMLTextAreaElement).value)"
                            rows="4"
                        />

                        <!-- select 类型 -->
                        <select
                            v-else-if="param.type === 'select'"
                            :value="localValues[param.key]"
                            @change="updateParam(param.key, ($event.target as HTMLSelectElement).value)"
                        >
                            <option
                                v-for="option in param.options"
                                :key="option.value"
                                :value="option.value"
                            >
                                {{ option.label }}
                            </option>
                        </select>

                        <!-- switch 类型 -->
                        <label v-else-if="param.type === 'switch'" class="ss-switch">
                            <input
                                type="checkbox"
                                :checked="localValues[param.key]"
                                @change="updateParam(param.key, ($event.target as HTMLInputElement).checked)"
                            />
                            <div></div>
                            <span>{{ param.label }}</span>
                        </label>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="cancel-btn" @click="cancelSettings">取消</button>
                    <button class="save-btn" @click="saveSettings">保存</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.node-settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(var(--color-card-rgb), 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.node-settings-panel {
    box-shadow: 0 0 5px var(--color-shader);
    background: var(--color-card);
    border-radius: 12px;
    min-width: 400px;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    padding: 10px;
}

.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 20px 10px 20px;
    border-bottom: 1px solid var(--color-card-2);
    gap: 12px;
}

.settings-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-font);
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
}

.close-btn {
    font-size: 1.1rem;
    background: transparent;
    border: none;
    color: var(--color-font-1);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s, color 0.2s;
    flex-shrink: 0;
}

.close-btn:hover {
    background: rgba(var(--color-main-rgb), 0.1);
    color: var(--color-font);
}

.settings-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
}

.param-item {
    margin-bottom: 16px;
}

.param-item:last-child {
    margin-bottom: 0;
}

.param-item > label {
    display: block;
    font-size: 0.85rem;
    color: var(--color-font);
    margin-bottom: 6px;
    font-weight: 500;
}

.param-item > label.required::after {
    content: ' *';
    color: var(--color-main);
}

.param-item input[type="text"],
.param-item input[type="number"],
.param-item textarea,
.param-item select {
    width: 100%;
    background: var(--color-card-2);
    border: 1px solid var(--color-card-2);
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 0.85rem;
    color: var(--color-font);
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    box-sizing: border-box;
}

.param-item input[type="text"]:focus,
.param-item input[type="number"]:focus,
.param-item textarea:focus,
.param-item select:focus {
    border-color: var(--color-main);
    background: var(--color-bg);
}

.param-item textarea {
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
}

.param-item select {
    cursor: pointer;
}

.param-item .ss-switch {
    display: flex;
    align-items: center;
    cursor: pointer;
}

.settings-footer {
    background: var(--color-card-1);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 20px;
    margin: 0 -10px -10px -10px;
}

.settings-footer button {
    padding: 6px 20px;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    font-weight: 500;
}

.cancel-btn {
    background: var(--color-card-2);
    color: var(--color-font);
}

.cancel-btn:hover {
    background: var(--color-card-1);
}

.save-btn {
    background: var(--color-main);
    color: var(--color-font-r);
}

.save-btn:hover {
    opacity: 0.9;
}

.settings-footer button:active {
    transform: scale(0.98);
}
</style>
