<script setup lang="ts">
import { Position, Handle, useVueFlow } from '@vue-flow/core'
import type { NodeProps, Connection } from '@vue-flow/core'
import { ref, computed, watch } from 'vue'

const props = defineProps<NodeProps>()
const { removeNodes } = useVueFlow()

// 节点参数值
const title = ref(props.data?.params?.title || '注释')
const content = ref(props.data?.params?.content || '')
const color = ref(props.data?.params?.color || 'yellow')

// 监听参数变化并更新到节点 data
watch([title, content, color], () => {
    if (props.data) {
        props.data.params = {
            title: title.value,
            content: content.value,
            color: color.value
        }
    }
})

// 颜色主题映射
const colorTheme = computed(() => {
    const themes: Record<string, { bg: string; border: string; text: string }> = {
        yellow: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
        blue: { bg: '#dbeafe', border: '#60a5fa', text: '#1e3a8a' },
        green: { bg: '#d1fae5', border: '#34d399', text: '#065f46' },
        red: { bg: '#fee2e2', border: '#f87171', text: '#991b1b' },
        purple: { bg: '#e9d5ff', border: '#a78bfa', text: '#5b21b6' }
    }
    return themes[color.value] || themes.yellow
})

// 删除节点
const deleteNode = () => {
    removeNodes([props.id])
}

defineEmits(['updateNodeInternals'])
</script>

<template>
    <div
        class="note-node"
        :style="{
            backgroundColor: colorTheme.bg,
            borderColor: colorTheme.border,
            color: colorTheme.text
        }">
        <div class="note-header">
            <input
                v-model="title"
                type="text"
                class="note-title"
                placeholder="注释标题"
                @mousedown.stop
                @pointerdown.stop
                :style="{ color: colorTheme.text }"
            />
            <button class="delete-btn" @click.stop="deleteNode" title="删除注释">
                <font-awesome-icon :icon="['fas', 'times']" />
            </button>
        </div>

        <textarea
            v-model="content"
            class="note-content"
            placeholder="在这里输入注释内容..."
            rows="4"
            @mousedown.stop
            @pointerdown.stop
            :style="{ color: colorTheme.text }"
        />

        <div class="note-footer">
            <select
                v-model="color"
                class="color-select"
                @mousedown.stop
                @pointerdown.stop
                :style="{
                    backgroundColor: colorTheme.bg,
                    borderColor: colorTheme.border,
                    color: colorTheme.text
                }">
                <option value="yellow">🟨 黄色</option>
                <option value="blue">🟦 蓝色</option>
                <option value="green">🟩 绿色</option>
                <option value="red">🟥 红色</option>
                <option value="purple">🟪 紫色</option>
            </select>
        </div>
    </div>
</template>

<style scoped>
.note-node {
    border: 2px solid;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.note-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.note-title {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-weight: bold;
    font-size: 0.9rem;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s;
}

.note-title:focus {
    background: rgba(255, 255, 255, 0.5);
}

.note-title::placeholder {
    opacity: 0.5;
}

.delete-btn {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 4px;
    color: inherit;
    cursor: pointer;
    padding: 4px 6px;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
}

.delete-btn:hover {
    background: rgba(0, 0, 0, 0.2);
    opacity: 1;
    transform: scale(1.05);
}

.delete-btn:active {
    transform: scale(0.95);
}

.delete-btn svg {
    width: 10px;
    height: 10px;
}

.note-content {
    width: calc(100% - 20px);
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    padding: 8px;
    font-size: 0.85rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 80px;
    outline: none;
    transition: background 0.2s, border-color 0.2s;
    font-family: inherit;
}

.note-content:focus {
    background: rgba(255, 255, 255, 0.5);
    border-color: rgba(0, 0, 0, 0.2);
}

.note-content::placeholder {
    opacity: 0.5;
}

.note-footer {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
}

.color-select {
    border: 1px solid;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 0.75rem;
    cursor: pointer;
    outline: none;
    transition: opacity 0.2s;
}

.color-select:hover {
    opacity: 0.8;
}
</style>
