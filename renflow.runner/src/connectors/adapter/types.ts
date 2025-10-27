// Adapter 相关类型定义
export type AdapterId = string

export interface AdapterOptions {
    // 任意适配器特定选项
    [key: string]: any
}

export interface AdapterMessage {
    id?: string
    from?: string
    to?: string
    text?: string
    raw?: any
    timestamp?: number
}

export type AdapterEvent = 'connected' | 'disconnected' | 'message' | 'error'

export type AdapterEventHandler = (payload?: any) => void
