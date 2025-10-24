/**
 * Toast 通知管理器
 * 提供全局 Toast 通知功能
 */

import type { App, ComponentPublicInstance } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastInstance {
    show: (message: string, type?: ToastType, duration?: number) => void
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
}

let toastInstance: ToastInstance | null = null

/**
 * Toast 通知 API
 */
export const toast = {
    /**
     * 显示成功提示
     */
    success(message: string, duration?: number) {
        toastInstance?.success(message, duration)
    },

    /**
     * 显示错误提示
     */
    error(message: string, duration?: number) {
        toastInstance?.error(message, duration)
    },

    /**
     * 显示警告提示
     */
    warning(message: string, duration?: number) {
        toastInstance?.warning(message, duration)
    },

    /**
     * 显示信息提示
     */
    info(message: string, duration?: number) {
        toastInstance?.info(message, duration)
    },

    /**
     * 显示自定义类型提示
     */
    show(message: string, type: ToastType = 'info', duration?: number) {
        toastInstance?.show(message, type, duration)
    }
}

/**
 * Vue 插件安装函数
 */
export function setupToast(app: App, toastRef: ComponentPublicInstance) {
    toastInstance = toastRef as unknown as ToastInstance

    // 将 toast 挂载到全局属性
    app.config.globalProperties.$toast = toast
}

// 类型声明
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $toast: typeof toast
    }
}
