// 装饰器元数据的存储符号（挂在原型上）
const EVENT_META = Symbol.for('renflow:adapter:event_handlers')

export type EventMetaRecord = { event: string; method: string }

/**
 * @event 装饰器
 * 用法：
 *   @event('message')
 *   onMessage(payload) { ... }
 *
 * event 可以是：
 * - 适配器本地事件名（例如 'message', 'connected'）
 * - 全局事件类型（例如 'adapter.message' 或 'queue.completed'）
 */
export function event(eventName: string) {
    return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
        const proto = target
        if (!proto[EVENT_META]) proto[EVENT_META] = [] as EventMetaRecord[]
        proto[EVENT_META].push({ event: eventName, method: propertyKey })
    }
}

export function getEventMeta(proto: any): EventMetaRecord[] {
    return (proto && proto[EVENT_META]) || []
}

// 默认导出保留向后兼容性
export default event
