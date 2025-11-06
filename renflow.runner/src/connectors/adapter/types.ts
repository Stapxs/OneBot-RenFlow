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

// ===============================

export interface NapcatAdapterOptions {
    url: string            // WebSocket 连接地址
    token: string          // 访问令牌
    reconnect?: boolean     // 是否启用自动重连，默认 true
    maxRetries?: number     // 最大重连次数，默认 5 次
    retryInterval?: number  // 重连间隔时间（毫秒），默认 2000 毫秒
    syncTimeout?: number    // 同步 callApi (通过 echo 等待) 的超时，毫秒，默认 5000
}
