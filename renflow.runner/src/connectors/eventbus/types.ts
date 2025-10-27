// EventBus 相关类型定义
export interface EventRecord {
    id?: string
    source?: string // 事件来源，比如 adapter id 或 queue id
    type: string
    payload?: any
    timestamp: number
}

export type EventFilter = Partial<{
    source: string | RegExp
    type: string | RegExp
}>

export type EventHandler = (evt: EventRecord) => void
