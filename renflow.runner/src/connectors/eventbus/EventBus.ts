import { EventEmitter } from 'events'
import type { EventRecord, EventFilter, EventHandler } from './types'

/**
 * 简易事件总线实现
 * 特点：
 * - 发布/订阅（支持按 source/type 过滤）
 * - 简单去重：通过事件 id 防止重复分发（可选）
 * - 回溯（replay）：保留最近 N 条事件以便新订阅者回放
 */
export class EventBus {
    private ee = new EventEmitter()
    private recent: EventRecord[] = []
    private recentSize = 200
    // 使用 Map 存储 id -> expiryTimestamp 以支持 TTL
    private seenIds = new Map<string, number>()
    private dedupeTTL = 30_000 // 默认 30s
    private cleanupIntervalHandle: any = null

    constructor(opts?: { recentSize?: number; dedupeTTL?: number }) {
        if (opts?.recentSize) this.recentSize = opts.recentSize
        if (opts?.dedupeTTL) this.dedupeTTL = opts.dedupeTTL
        // 定期清理过期 id，避免内存增长
        this.cleanupIntervalHandle = setInterval(() => this.cleanup(), Math.max(1000, this.dedupeTTL / 4))
    }

    // 发布事件到总线
    publish(evt: EventRecord) {
        const now = Date.now()
        // 如果有 id，使用去重集合避免重复发布（并带 TTL）
        if (evt.id) {
            const exp = this.seenIds.get(evt.id)
            if (exp && exp > now) return
            this.seenIds.set(evt.id, now + this.dedupeTTL)
        }

        // 保存到最近事件窗口
        this.recent.push(evt)
        if (this.recent.length > this.recentSize) this.recent.shift()

        this.ee.emit('event', evt)
    }

    // 支持订阅；filter 可为 null 表示接收所有事件
    // opts.replay: 回放最近 N 条事件
    subscribe(filter: EventFilter | null, handler: EventHandler, opts?: { replay?: number }) {
        const wrapped = (evt: EventRecord) => {
            if (!filter) return handler(evt)
            if (filter.source) {
                if (filter.source instanceof RegExp) {
                    if (!filter.source.test(evt.source || '')) return
                } else if ((evt.source || '') !== filter.source) return
            }
            if (filter.type) {
                if (filter.type instanceof RegExp) {
                    if (!filter.type.test(evt.type)) return
                } else if (evt.type !== filter.type) return
            }
            handler(evt)
        }

        this.ee.on('event', wrapped)

        // 回放最近的事件（可选）
        if (opts?.replay && opts.replay > 0) {
            const slice = this.recent.slice(-opts.replay)
            for (const e of slice) wrapped(e)
        }

        return () => { this.ee.removeListener('event', wrapped) }
    }

    // 订阅一次
    once(filter: EventFilter | null, handler: EventHandler) {
        if (!filter) {
            this.ee.once('event', handler)
            return
        }
        // 对于 filter，使用临时 wrapper 实现 once
        const wrapper = (evt: EventRecord) => {
            if (filter.source && filter.source instanceof RegExp) {
                if (!filter.source.test(evt.source || '')) return
            } else if (filter.source && evt.source !== filter.source) return
            if (filter.type && filter.type instanceof RegExp) {
                if (!filter.type.test(evt.type)) return
            } else if (filter.type && evt.type !== filter.type) return
            handler(evt)
            this.ee.removeListener('event', wrapper)
        }
        this.ee.on('event', wrapper)
    }

    // 获取最近 N 条事件
    getRecent(n = 50): EventRecord[] {
        return this.recent.slice(-n)
    }

    // 设置去重 TTL（毫秒）
    setDedupeTTL(ms: number) {
        this.dedupeTTL = ms
    }

    // 清理历史事件和去重记录（可选）
    clearHistory() {
        this.recent = []
        this.seenIds.clear()
    }

    // 清理过期的 seenIds
    private cleanup() {
        const now = Date.now()
        for (const [id, exp] of Array.from(this.seenIds.entries())) {
            if (exp <= now) this.seenIds.delete(id)
        }
    }

    // 释放资源
    dispose() {
        if (this.cleanupIntervalHandle) clearInterval(this.cleanupIntervalHandle)
        this.clearHistory()
        this.ee.removeAllListeners()
    }
}

export default EventBus

