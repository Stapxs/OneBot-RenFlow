export interface QueueMessage {
    id?: string
    type: string
    payload: any
    meta?: Record<string, any>
}

export interface EnqueueOptions {
    delay?: number
    attempts?: number
}

export interface QueueStats {
    waiting: number
    active: number
    completed: number
    failed: number
}

export type QueueEvent = 'completed' | 'failed' | 'active' | 'waiting'
