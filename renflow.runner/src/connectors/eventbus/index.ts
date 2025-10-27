import { EventBus } from './EventBus'

// 导出一个默认的全局事件总线实例，运行时模块可以直接引入
export const eventBus = new EventBus()

export { EventBus }

export default eventBus
