import { eventBus } from './eventbus'
import { AdapterEvents } from './events'


// 简易的连接器管理器
// 负责注册/获取适配器，并提供队列适配器的工厂方法
export class ConnectorManager {
    private adapters: Map<string, any> = new Map()

    // 注册一个命名适配器（任意类型：queue / bot adapter 等）
    registerAdapter(id: string, adapter: any) {
        this.adapters.set(id, adapter)
        // 发布已注册事件，source 为 adapter id，便于订阅者按 source 过滤
        try {
            eventBus.publish({ id, source: id, type: AdapterEvents.REGISTERED, payload: { id }, timestamp: Date.now() })
        } catch (e) { /* ignore */ }
    }

    /**
     * 通过 adapterId 调用适配器导出的 @api 方法
     * 如果适配器未注册或不支持 callApi，将抛出错误
     */
    async callAdapterApi(adapterId: string, apiName: string, ...args: any[]): Promise<any> {
        const adapter = this.adapters.get(adapterId)
        if (!adapter) throw new Error(`adapter not found: ${adapterId}`)
        if (typeof adapter.callApi !== 'function') throw new Error(`adapter does not support callApi: ${adapterId}`)
        return await adapter.callApi(apiName, ...args)
    }

    // 注销适配器
    unregisterAdapter(id: string) {
        const a = this.adapters.get(id)
        this.adapters.delete(id)
        try {
            eventBus.publish({ id, source: id, type: AdapterEvents.UNREGISTERED, payload: { id }, timestamp: Date.now() })
        } catch (e) { /* ignore */ }
        return a
    }

    // 获取已注册的适配器
    getAdapter<T = any>(id: string): T | undefined {
        return this.adapters.get(id) as T | undefined
    }

    // Note: queue adapters removed — message flow is handled via adapters -> EventBus

    // 创建 BotAdapter 的简单工厂（支持 'mock' 作为测试实现）
    async createBotAdapter(type: string, opts: any, adapterId?: string) {
        const id = adapterId || `bot-${Math.random().toString(36).slice(2, 8)}`
        if (type === 'mock') {
            // 使用动态 import，兼容 ESM
            const mod = await import('./adapter/MockBotAdapter')
            // 支持 default 或命名导出
            const MockBotAdapter = (mod && (mod.MockBotAdapter || mod.default))
            if (!MockBotAdapter) throw new Error('MockBotAdapter not found')
            const adapter = new MockBotAdapter(id, opts)
            this.registerAdapter(id, adapter)
            return adapter
        }

        if (type === 'napcat') {
            // 支持 OneBot 实现（Napcat）
            const mod = await import('./adapter/onebot/NapcatAdapter')
            const NapcatAdapter = (mod && (mod.NapcatAdapter || mod.default))
            if (!NapcatAdapter) throw new Error('NapcatAdapter not found')
            const adapter = new NapcatAdapter(id, opts)
            this.registerAdapter(id, adapter)
            return adapter
        }

        throw new Error(`Bot adapter type not implemented: ${type}`)
    }
}

// 包内单例管理器（便于简单用法）
export const connectorManager = new ConnectorManager()

export default ConnectorManager
