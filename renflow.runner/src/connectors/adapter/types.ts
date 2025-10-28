// Adapter 相关类型定义
export type AdapterId = string

export interface AdapterOptions {
    [key: string]: any
}

export type AdapterEventType =
    'connected' | 'disconnected' | 'error'
    | 'message' | 'message_mine'
    | string

export interface AdapterMessage {
    data: any
    timestamp: number
}

export type AdapterEventHandler = (payload?: any) => void
