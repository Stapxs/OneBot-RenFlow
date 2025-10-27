import type { EventRecord } from './eventbus/types'

// 统一的事件类型常量，适配器/上层可复用
export const AdapterEvents = {
    REGISTERED: 'adapter.registered',
    UNREGISTERED: 'adapter.unregistered',
    CONNECTED: 'adapter.connected',
    DISCONNECTED: 'adapter.disconnected',
    MESSAGE: 'adapter.message',
    ERROR: 'adapter.error',
} as const

export type AdapterEventType = typeof AdapterEvents[keyof typeof AdapterEvents]

// 统一的消息数据格式，供适配器实现与上层使用
export interface MessageData {
    id?: string
    from?: string
    to?: string
    text?: string
    /** 原始平台返回的原始对象 */
    raw?: any
    /** 时间戳（毫秒） */
    timestamp?: number
    /** 可选的消息子类型，例如 'text', 'image', 'notice' 等 */
    subtype?: string
    // 扩展字段保留
    [key: string]: any
}

// 当 EventBus 发布 message 事件时，payload 应符合 MessageData 结构。
export interface MessageEvent extends EventRecord {
    type: typeof AdapterEvents.MESSAGE
    payload: MessageData
}

export default {
    AdapterEvents,
}
