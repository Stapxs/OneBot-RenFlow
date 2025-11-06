<script setup lang="ts">
interface Props {
    nodeId: string
    params?: any[]
    modelValue: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:model-value', value: Record<string, any>): void
}>()

const supportMsgTypes = [
    { label: '文本消息', desc: '普通的文本样式，多个文本样式叠加不会自动换行。', value: 'text', icon: 'fas fa-font', params: [{name: 'text', label: '文本内容'}] },
    { label: '图片消息', desc: '一张图片，节点参数、base64 或者 url 均可。', value: 'image', icon: 'fas fa-image', params: [{name: 'image', label: '图片地址'}] },
] as { label: string; value: string; icon: string; params: {name: string; label: string}[]; desc?: string }[]

import { ref, watch } from 'vue'

// 本地的消息项列表（拖入 msg-list 后存放）
const msgList = ref<Array<any>>((props.modelValue?.msgList || []).map((it: any) => ({
    ...it,
    _id: it._id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    _open: it._open !== undefined ? it._open : true
})))
const selected = ref<any>(null)

// 将变更同步到外部 v-model（modelValue）
watch(msgList, (val) => {
    emit('update:model-value', { ...(props.modelValue || {}), msgList: val })
}, { deep: true })

// 拖拽开始：用于从左侧拖入（外部来源）或开始在列表内拖动
const onDragStart = (e: DragEvent, item: any, fromList = false, index?: number) => {
    if (!e.dataTransfer) return

    // 如果来自列表内部，标记为 internal 并携带源索引
    if (fromList && typeof index === 'number') {
        try {
            e.dataTransfer.setData('application/json', JSON.stringify({ _internal: true, index }))
        } catch (_) { void 0 }
    } else {
        const payload = JSON.stringify(item)
        try { e.dataTransfer.setData('application/json', payload) } catch (_) { void 0 }
        try { e.dataTransfer.setData('text/plain', payload) } catch (_) { void 0 }
    }

    e.dataTransfer.effectAllowed = 'copyMove'
}

// 列表上方拖拽悬停，允许放置并记录目标索引（基于鼠标位置）
const onDragOverList = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

// drop 处理：支持两种场景
// 1) 外部拖入（application/json 包含 item） -> append 到末尾
// 2) 列表内部拖拽（payload._internal === true 且包含 index） -> 在目标位置插入并从原位置移除
const onDropToList = (e: DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer) return

    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
    if (!raw) return

    try {
        const parsed = JSON.parse(raw)

        // 内部移动
        if (parsed && parsed._internal === true && typeof parsed.index === 'number') {
            const from = parsed.index
            // 计算目标 index：基于事件目标元素或直接 append
            // 尝试从事件 target 推断插入位置
            let to = msgList.value.length
            const targetEl = (e.target as HTMLElement)
            // 如果目标是某个 msg-item 的子元素，找到它的父 msg-item 并取其索引
            const itemEl = targetEl.closest?.('.msg-item') as HTMLElement | null
            if (itemEl) {
                const key = itemEl.getAttribute('data-key')
                if (key) {
                    const idx = msgList.value.findIndex(it => it._id === key)
                    if (idx >= 0) {
                        // 根据鼠标位置决定插入到 idx 或 idx+1
                        const rect = itemEl.getBoundingClientRect()
                        const y = e.clientY
                        to = (y - rect.top) > rect.height / 2 ? idx + 1 : idx
                    }
                }
            }

            // 不做无效移动
            if (from === to || from + 1 === to) return

            const item = msgList.value.splice(from, 1)[0]
            // 如果移除后目标索引在原来之后，需要减一
            const finalTo = from < to ? to - 1 : to
            msgList.value.splice(finalTo, 0, item)
            return
        }

        // 非内部移动：作为新项加入
        const item = parsed
        msgList.value.push({ ...item, _id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, _open: true })
    } catch (err) { void 0 }
}

const removeItem = (index: number) => {
    msgList.value.splice(index, 1)
    if (selected.value && selected.value._id === msgList.value[index]?._id) selected.value = null
}

const toggleOpen = (index: number) => {
    const it = msgList.value[index]
    if (!it) return
    it._open = !it._open
}
</script>

<template>
    <div class="send-msg-settings">
        <div class="msg-items">
            <div v-for="item in supportMsgTypes" :key="item.value"
                class="msg-item"
                draggable="true"
                @dragstart="onDragStart($event, item)">
                <font-awesome-icon :icon="item.icon" />
                <div>
                    <span>{{ item.label }}</span>
                    <a>{{ item.desc || item.label }}</a>
                </div>
            </div>
        </div>

        <div class="msg-list msg-items" @dragover.prevent="onDragOverList($event)" @drop.stop.prevent="onDropToList($event)">
            <div v-for="(item, index) in msgList" :key="item._id" class="msg-item"
                draggable="true"
                :data-key="item._id"
                @dragstart="onDragStart($event, item, true, index)" @dragover.prevent>
                <font-awesome-icon :icon="item.icon" />
                <div>
                    <span>{{ item.label }}</span>
                </div>
                <div class="msg-list-item-actions">
                    <button title="移除" @click.stop.prevent="removeItem(index)">
                        <font-awesome-icon icon="fas fa-xmark" />
                    </button>
                    <button title="展开设置" @click.stop.prevent="toggleOpen(index)">
                        <font-awesome-icon :icon="['fas', item._open ? 'caret-down' : 'caret-up']" />
                    </button>
                </div>
                <div v-show="item._open" class="item-config">
                    <div v-for="param in item.params" :key="param.name">
                        <label :for="`param-${index}-${param.name}`">
                            {{ param.label }}:
                        </label>
                        <input :id="`param-${index}-${param.name}`"
                            v-model="item.data"
                            type="text">
                    </div>
                </div>
            </div>
            <div v-if="msgList.length === 0" class="msg-list-empty">将元素拖到这里，你可以拖拽已有项目重新排序。</div>
        </div>
    </div>
</template>

<style scoped>
.send-msg-settings {
    height: 52vh;
    display: flex;
    padding: 10px;
}
.send-msg-settings > div {
    overflow-y: scroll;
}
.send-msg-settings > div::-webkit-scrollbar {
    width: 0;
}
.msg-items {
    flex-direction: column;
    display: flex;
    width: 20vw;
}
.msg-items > div {
    background: var(--color-card-1);
    padding: 10px;
    border-radius: 7px;
    flex-wrap: wrap;
    margin: 3px;
    flex-direction: row;
    display: flex;
}
.msg-items > div > svg {
    margin-top: 2px;
    height: 16px;
    width: 16px;
}
.msg-items > div > div {
    max-width: 80%;
    margin-left: 8px;
    display: flex;
    flex-direction: column;
}
.msg-items > div > div > span {
    font-size: 0.9rem
}
.msg-items > div > div > a {
    font-size: 0.75rem;
    color: var(--color-font-2);
}

.msg-list {
    position: relative;
    background-image:
        radial-gradient(circle, #ccc 1px, transparent 1px),
        repeating-linear-gradient(to right, transparent 0 20px, black 20px 20px),
        repeating-linear-gradient(to bottom, transparent 0 20px, black 20px 20px);
    background-size:
        20px 20px,
        20px 20px,
        20px 20px;
    border: 2px solid var(--color-card-2);
    border-radius: 7px;
    margin-left: 10px;
    overflow: hidden;
    padding: 10px;
    width: 30vw;
}
.msg-list-empty {
    color: var(--color-font-2);
    font-size: 0.75rem;
    text-align: center;
    padding: 20px;
}
.msg-list-item-actions {
    flex-direction: row-reverse !important;
    display: flex !important;
    justify-items: end;
    flex: 1;
}
.msg-list-item-actions > button {
    background: var(--color-card-2);
    border-radius: 7px;
    margin-left: 3px;
    cursor: pointer;
    border: none;
    height: 25px;
    width: 40px;
}
.msg-list-item-actions > button > svg {
    color: var(--color-font-1);
    transform: rotate(180deg);
}
.item-config {
    max-width: unset !important;
    width: 100%;
}
.item-config > div {
    margin-top: 15px;
    align-items: center;
    display: flex;
    width: 100%;
}
.item-config > div > label {
    font-size: 0.8rem;
}
.item-config > div > input {
    padding: 0 10px;
    border: none;
    height: 25px;
    border-radius: 7px;
    display: block;
    margin-left: 10px;
    flex: 1;
}
.item-config > div > input:focus {
    outline: none;
}
</style>
