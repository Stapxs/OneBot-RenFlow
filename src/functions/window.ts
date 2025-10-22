import { backend } from './backend'
import { Logger } from './base'
import type { Router } from 'vue-router'

const logger = new Logger()

export interface WindowOptions {
    label: string
    url: string
    title?: string
    width?: number
    height?: number
}

/**
 * 窗口管理器
 */
export class WindowManager {
    private router?: Router

    /**
     * 设置路由实例（用于 Web 环境）
     * @param router Vue Router 实例
     */
    setRouter(router: Router) {
        this.router = router
    }

    /**
     * 创建或显示一个窗口
     * @param options 窗口选项
     * @returns 返回 'created' 表示创建了新窗口，'existing' 表示窗口已存在并被显示
     */
    async createWindow(options: WindowOptions): Promise<string> {
        if (backend.isDesktop()) {
            // Tauri 桌面环境：创建新窗口
            logger.info(`创建窗口: ${options.label} -> ${options.url}`)

            try {
                const result = await backend.call('win:createWindow', { options })
                return result as string
            } catch (error) {
                logger.error(error as Error, `创建窗口失败: ${options.label}`)
                throw error
            }
        } else {
            // Web 环境：使用路由导航
            if (this.router) {
                await this.router.push(options.url)
                return 'navigated'
            } else {
                logger.error(null, 'Router 未设置，无法在 Web 环境中导航')
                throw new Error('Router not initialized')
            }
        }
    }

    /**
     * 关闭指定窗口
     * @param label 窗口标签
     */
    async closeWindow(label: string): Promise<void> {
        if (backend.isDesktop()) {
            // Tauri 桌面环境：关闭窗口
            logger.info(`关闭窗口: ${label}`)

            try {
                await backend.call('win:closeWindow', { label })
            } catch (error) {
                logger.error(error as Error, `关闭窗口失败: ${label}`)
                throw error
            }
        } else {
            // Web 环境：返回首页
            if (this.router) {
                await this.router.push('/')
            }
        }
    }

    /**
     * 显示指定窗口
     * @param label 窗口标签
     */
    async showWindow(label: string): Promise<void> {
        if (backend.isDesktop()) {
            logger.info(`显示窗口: ${label}`)

            try {
                await backend.call('win:showWindow', { label })
            } catch (error) {
                logger.error(error as Error, `显示窗口失败: ${label}`)
                throw error
            }
        }
        // Web 环境不需要实现（始终可见）
    }

    /**
     * 隐藏指定窗口
     * @param label 窗口标签
     */
    async hideWindow(label: string): Promise<void> {
        if (backend.isDesktop()) {
            logger.info(`隐藏窗口: ${label}`)

            try {
                await backend.call('win:hideWindow', { label })
            } catch (error) {
                logger.error(error as Error, `隐藏窗口失败: ${label}`)
                throw error
            }
        }
        // Web 环境不需要实现
    }

    /**
     * 开始拖拽窗口
     * @param label 窗口标签
     */
    async startDragging(label: string): Promise<void> {
        if (backend.isDesktop()) {
            try {
                await backend.call('win:startDragging', { label })
            } catch (error) {
                logger.error(error as Error, `开始拖拽失败: ${label}`)
            }
        }
        // Web 环境不支持拖拽
    }

    /**
     * 最小化窗口
     * @param label 窗口标签
     */
    async minimizeWindow(label: string): Promise<void> {
        if (backend.isDesktop()) {
            try {
                await backend.call('win:minimize', { label })
            } catch (error) {
                logger.error(error as Error, `最小化失败: ${label}`)
                throw error
            }
        }
        // Web 环境不支持
    }

    /**
     * 最大化窗口
     * @param label 窗口标签
     */
    async maximizeWindow(label: string): Promise<void> {
        if (backend.isDesktop()) {
            try {
                await backend.call('win:maximize', { label })
            } catch (error) {
                logger.error(error as Error, `最大化失败: ${label}`)
                throw error
            }
        }
        // Web 环境不支持
    }

    /**
     * 切换最大化状态
     * @param label 窗口标签
     */
    async toggleMaximize(label: string): Promise<void> {
        if (backend.isDesktop()) {
            try {
                await backend.call('win:toggleMaximize', { label })
            } catch (error) {
                logger.error(error as Error, `切换最大化失败: ${label}`)
                throw error
            }
        }
        // Web 环境不支持
    }

    /**
     * 检查窗口是否最大化
     * @param label 窗口标签
     */
    async isMaximized(label: string): Promise<boolean> {
        if (backend.isDesktop()) {
            try {
                return await backend.call('win:isMaximized', { label })
            } catch (error) {
                logger.error(error as Error, `检查最大化状态失败: ${label}`)
                return false
            }
        }
        return false
    }

    /**
     * 打开编辑窗口
     */
    async openEditWindow(): Promise<void> {
        await this.createWindow({
            label: 'edit',
            url: '/edit',
            title: 'Edit - Ren Flow',
            width: 800,
            height: 600
        })
    }

    /**
     * 打开设置窗口
     */
    async openSettingsWindow(): Promise<void> {
        await this.createWindow({
            label: 'settings',
            url: '/settings',
            title: 'Settings - Ren Flow',
            width: 700,
            height: 500
        })
    }
}

// 导出单例
export const windowManager = new WindowManager()
