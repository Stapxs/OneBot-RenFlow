// 装饰器元数据的存储符号（挂在原型上）
const EVENT_META = Symbol.for('renflow:adapter:event_handlers')
const API_META = Symbol.for('renflow:adapter:api_methods')

export type EventMetaRecord = { event: string; method: string }
export type ApiMetaRecord = { name: string; method: string }

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

/**
 * @api 装饰器 -- 将适配器的方法标记为可通过 callApi 调用的 API
 * 用法：
 *   @api('getStatus')
 *   async getStatus() { return {...} }
 *
 * 如果不提供 name，则使用方法名作为 API 名称
 */
export function api(name?: string) {
    return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
        const proto = target
        if (!proto[API_META]) proto[API_META] = [] as ApiMetaRecord[]
        proto[API_META].push({ name: name ?? propertyKey, method: propertyKey })
    }
}

export function getEventMeta(proto: any): EventMetaRecord[] {
    return (proto && proto[EVENT_META]) || []
}

export function getApiMeta(proto: any): ApiMetaRecord[] {
    return (proto && proto[API_META]) || []
}

// 默认导出保留向后兼容性
export default event
