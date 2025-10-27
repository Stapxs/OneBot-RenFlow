import { BaseBotAdapter } from './BotAdapter'
import type { AdapterOptions, AdapterMessage } from './types'
import event from './decorators'

/**
 * MockBotAdapter: 用于本地测试/演示的轻量实现
 * - connect 会标记状态并触发 'connected' 事件
 * - send 会触发本地回调并在短延迟后触发 'message'（模拟回显/回复）
 */
export class MockBotAdapter extends BaseBotAdapter {
    constructor(id: string, opts?: AdapterOptions) {
        super(id, opts)
    }

    async connect(): Promise<void> {
        this.connected = true
        // include adapter id so EventBus events have a stable id field
        this.emitEvent('connected', { id: this.id, source: this.id, timestamp: Date.now() })
    }

    async disconnect(): Promise<void> {
        this.connected = false
        this.emitEvent('disconnected', { id: this.id, source: this.id, timestamp: Date.now() })
    }

    async send(message: AdapterMessage): Promise<void> {
        // 简单的行为：触发 'message' 事件（模拟收到回复）
        // 实际实现会把消息发送到远端平台
        // ensure message contains an id (fallback to adapter id)
        this.emitEvent('message', { id: message.id ?? this.id, ...message, from: this.id, timestamp: Date.now() })
        // 模拟异步回复：在 50ms 后触发另一个 message
        setTimeout(() => {
            this.emitEvent('message', { id: message.id ?? this.id, from: 'remote', to: message.from, text: `echo:${message.text}`, raw: null, timestamp: Date.now() })
        }, 50)
    }

    // ---- 示例：使用 @event 装饰器注册的处理方法 ----
    // 本地适配器事件（会通过 this.ee 进行订阅）
    @event('message')
    handleLocalMessage(payload: any) {
        // 这是一个示例，展示如何在适配器内部响应本地 message 事件
        // 生产代码中请替换为实际处理逻辑
        // eslint-disable-next-line no-console
        console.log('[MockAdapter:@event local message]', payload)
    }

    // 全局事件示例：订阅 EventBus 上的 'adapter.message' 事件
    @event('adapter.message')
    handleGlobalAdapterMessage(evt: any) {
        // eslint-disable-next-line no-console
        console.log('[MockAdapter:@event global adapter.message]', evt)
    }
}

export default MockBotAdapter
