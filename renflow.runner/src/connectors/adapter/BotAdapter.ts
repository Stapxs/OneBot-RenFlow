import { EventEmitter } from 'events'
import type { AdapterId, AdapterOptions, AdapterMessage, AdapterEvent, AdapterEventHandler } from './types'
import { eventBus } from '../eventbus'
import { getEventMeta } from './decorators'

export interface BotAdapter {
    id: AdapterId
    options?: AdapterOptions
    connect(): Promise<void>
    disconnect(): Promise<void>
    send(message: AdapterMessage): Promise<void>
    on(event: AdapterEvent, handler: AdapterEventHandler): void
    off(event: AdapterEvent, handler: AdapterEventHandler): void
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

    on(event: AdapterEvent, handler: AdapterEventHandler) {
        this.ee.on(event, handler)
    }

    off(event: AdapterEvent, handler: AdapterEventHandler) {
        this.ee.off(event, handler)
    }

    protected emitEvent(event: AdapterEvent, payload?: any) {
        try { this.ee.emit(event, payload) } catch (e) { /* swallow */ }
        // 也将关键事件发布到全局 EventBus，便于观测与外部集成
        try {
            eventBus.publish({
                id: payload?.id || undefined,
                source: this.id,
                type: `adapter.${event}`,
                payload,
                timestamp: Date.now(),
            })
        } catch (e) { /* ignore */ }
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
                // 如果是全局事件（包含点号），通过 eventBus.subscribe 按 type 订阅
                if (m.event && m.event.includes('.')) {
                    const unsub = (eventBus as any).subscribe ? eventBus.subscribe({ type: m.event }, bound) : () => { }
                    ;(this as any).__decoratorUnsubscribes.push(unsub)
                } else {
                    // 本地适配器事件
                    this.ee.on(m.event, bound)
                    ;(this as any).__decoratorUnsubscribes.push(() => this.ee.off(m.event, bound))
                }
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
}

export default BotAdapter
