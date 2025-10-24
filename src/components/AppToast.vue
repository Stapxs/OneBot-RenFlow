<template>
    <Teleport to="body">
        <TransitionGroup name="toast" tag="div" class="toast-container">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="toast-item"
                :class="[`toast-${toast.type}`]">
                <div class="toast-icon">
                    <font-awesome-icon
                        :icon="['fas', getIcon(toast.type)]" />
                </div>
                <div class="toast-content">
                    {{ toast.message }}
                </div>
            </div>
        </TransitionGroup>
    </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: number
    message: string
    type: ToastType
    duration: number
}

const toasts = ref<Toast[]>([])
let toastIdCounter = 0

/**
 * 显示 Toast 通知
 */
function show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = toastIdCounter++
    const toast: Toast = {
        id,
        message,
        type,
        duration
    }

    toasts.value.push(toast)

    // 自动移除
    setTimeout(() => {
        remove(id)
    }, duration)
}

/**
 * 移除 Toast
 */
function remove(id: number) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
        toasts.value.splice(index, 1)
    }
}

/**
 * 获取图标
 */
function getIcon(type: ToastType): string {
    switch (type) {
        case 'success':
            return 'fa-circle-check'
        case 'error':
            return 'fa-circle-xmark'
        case 'warning':
            return 'fa-triangle-exclamation'
        case 'info':
        default:
            return 'fa-circle-info'
    }
}

// 暴露方法供外部调用
defineExpose({
    show,
    success: (msg: string, duration?: number) => show(msg, 'success', duration),
    error: (msg: string, duration?: number) => show(msg, 'error', duration),
    warning: (msg: string, duration?: number) => show(msg, 'warning', duration),
    info: (msg: string, duration?: number) => show(msg, 'info', duration),
})
</script>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    pointer-events: none;
}

.toast-item {
    background: rgba(var(--color-card-rgb), 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    padding: 10px 17px;
    box-shadow:0 0 5px var(--color-shader);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 150px;
    max-width: 400px;
    pointer-events: auto;
    border: 1px solid var(--color-card-2);
}

.toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
}

.toast-content {
    color: var(--color-font);
    font-size: 0.75rem;
    flex: 1;
}

/* Toast 类型样式 */
.toast-success .toast-icon {
    color: #52c41a;
}

.toast-error .toast-icon {
    color: #ff4d4f;
}

.toast-warning .toast-icon {
    color: #faad14;
}

.toast-info .toast-icon {
    color: #1890ff;
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
}

.toast-move {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
