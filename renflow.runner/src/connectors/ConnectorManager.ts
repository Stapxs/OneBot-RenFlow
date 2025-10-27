import type { QueueAdapter } from './queue/QueueAdapter'
import { InMemoryQueueAdapter } from './queue/InMemoryQueueAdapter'
import { RabbitMQQueueAdapter } from './queue/RabbitMQQueueAdapter'
import { eventBus } from './eventbus'


// 简易的连接器管理器
// 负责注册/获取适配器，并提供队列适配器的工厂方法
export class ConnectorManager {
    private adapters: Map<string, any> = new Map()

    // 注册一个命名适配器（任意类型：queue / bot adapter 等）
    registerAdapter(id: string, adapter: any) {
        this.adapters.set(id, adapter)
        // 发布已注册事件，source 为 adapter id，便于订阅者按 source 过滤
        try {
            eventBus.publish({ id, source: id, type: 'adapter.registered', payload: { id }, timestamp: Date.now() })
        } catch (e) { /* ignore */ }
    }

    // 注销适配器
    unregisterAdapter(id: string) {
        const a = this.adapters.get(id)
        this.adapters.delete(id)
        try {
            eventBus.publish({ id, source: id, type: 'adapter.unregistered', payload: { id }, timestamp: Date.now() })
        } catch (e) { /* ignore */ }
        return a
    }

    // 获取已注册的适配器
    getAdapter<T = any>(id: string): T | undefined {
        return this.adapters.get(id) as T | undefined
    }

    // 创建队列适配器的简单工厂，支持 memory 或 rabbit
    // adapterId: 可选的适配器标识，便于在事件总线中区分来源
    createQueueAdapter(type: 'memory' | 'rabbit', opts: any, adapterId?: string): QueueAdapter {
        if (type === 'memory') {
            const concurrency = opts?.concurrency || 1
            const id = adapterId || `memory-${Math.random().toString(36).slice(2, 8)}`
            const adapter = new InMemoryQueueAdapter(concurrency, id)
            // 注册到管理器，便于后续获取
            this.registerAdapter(id, adapter)
            return adapter
        }

        if (type === 'rabbit') {
            const id = adapterId || `rabbit-${Math.random().toString(36).slice(2, 8)}`
            const adapter = new RabbitMQQueueAdapter(opts, id)
            this.registerAdapter(id, adapter)
            return adapter
        }

        throw new Error(`Unknown queue adapter type: ${type}`)
    }

    // 创建 BotAdapter 的简单工厂（支持 'mock' 作为测试实现）
    async createBotAdapter(type: 'mock' | 'onebot', opts: any, adapterId?: string) {
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

        // onebot 支持尚未实现，返回一个占位错误
        throw new Error(`Bot adapter type not implemented: ${type}`)
    }
}

// 包内单例管理器（便于简单用法）
export const connectorManager = new ConnectorManager()

export default ConnectorManager
