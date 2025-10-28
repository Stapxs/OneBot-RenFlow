import { EventEmitter } from 'events'
import type { AdapterId, AdapterOptions, AdapterMessage, AdapterEventHandler, AdapterEventType } from './types'
import { getEventMeta, getApiMeta } from './decorators'

export interface BotAdapter {
    id: AdapterId
    options?: AdapterOptions
    connect(): Promise<void>
    disconnect(): Promise<void>
    send(message: AdapterMessage): Promise<void>
    on(event: string, handler: AdapterEventHandler): void
    off(event: string, handler: AdapterEventHandler): void
    callApi(name: string, ...args: any[]): Promise<any>

    // 适配器必须实现一些通用的 API
    get(message: AdapterMessage): Promise<void>
}

/**
 * 基础 BotAdapter 实现，子类可复用事件分发与简单状态管理
 */
export abstract class BaseBotAdapter implements BotAdapter {
    public id: AdapterId
    public options?: AdapterOptions
    protected ee = new EventEmitter()
    protected connected = false

    constructor(id: AdapterId, opts?: AdapterOptions) {
        this.id = id
        this.options = opts
        // 注册基于装饰器的方法
        this.registerDecoratedHandlers()
    }

    abstract connect(): Promise<void>
    abstract disconnect(): Promise<void>
    abstract send(message: AdapterMessage): Promise<void>
    // 抽象方法，强制子类实现
    abstract get(message: AdapterMessage): Promise<any>

    on(event: string | string[], handler: AdapterEventHandler) {
        if (Array.isArray(event)) {
            for (const ev of event) {
                this.ee.on(ev, handler)
            }
        } else {
            this.ee.on(event, handler)
        }
    }

    off(event: string | string[], handler: AdapterEventHandler) {
        if (Array.isArray(event)) {
            for (const ev of event) {
                this.ee.off(ev, handler)
            }
        } else {
            this.ee.off(event, handler)
        }
    }

    protected emitEvent(event: AdapterEventType, payload?: any) {
        try { this.ee.emit(event, payload) } catch (e) { /* swallow */ }
    }

    // 扫描原型上的 @event 装饰器并注册处理器
    private registerDecoratedHandlers() {
        try {
            const meta = getEventMeta(Object.getPrototypeOf(this))
            if (!meta || meta.length === 0) return
            // 存放用于取消注册的引用
            ;(this as any).__decoratorUnsubscribes = (this as any).__decoratorUnsubscribes || []
            for (const m of meta) {
                const fn = (this as any)[m.method]
                if (typeof fn !== 'function') continue
                const bound = fn.bind(this)

                // 本地适配器事件
                this.ee.on(m.event, bound)
                ;(this as any).__decoratorUnsubscribes.push(() => this.ee.off(m.event, bound))
            }
        } catch (e) {
            // 忽略装饰器注册错误
        }
    }

    // 取消通过装饰器注册的监听器（供子类在 dispose/断开时调用）
    protected unregisterDecoratedHandlers() {
        try {
            const arr = (this as any).__decoratorUnsubscribes || []
            for (const u of arr) { try { u() } catch (e) { /* ignore */ } }
            (this as any).__decoratorUnsubscribes = []
        } catch (e) { /* ignore */ }
    }

    /**
     * 调用由 @api 装饰的方法（按名称查找）
     * 如果找到，将以 this 为上下文执行并返回结果（支持同步/异步方法）
     */
    public async callApi(name: string, ...args: any[]): Promise<any> {
        const meta = getApiMeta(Object.getPrototypeOf(this))
        if (!meta || meta.length === 0) throw new Error('no api methods')
        const rec = meta.find(m => m.name === name)
        if (!rec) throw new Error(`api not found: ${name}`)
        const fn = (this as any)[rec.method]
        if (typeof fn !== 'function') throw new Error(`api method is not a function: ${rec.method}`)
        // support promise or value
        return await Promise.resolve(fn.apply(this, args))
    }
}

export default BotAdapter
