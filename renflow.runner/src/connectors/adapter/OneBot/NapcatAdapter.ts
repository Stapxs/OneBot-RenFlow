import { BaseBotAdapter } from '../BotAdapter'
import event from '../decorators'
import type { AdapterOptions, AdapterMessage } from '../types'
import { Mapping, mapToInterface } from '../util'
import { RenMessage } from '../../../types'

/**
 * NapcatAdapter: OneBot 协议适配器（Napcat 风格的 websocket 接入）
 * 连接将使用 `${url}?access_token=${token}`
 */
export class NapcatAdapter extends BaseBotAdapter {
    private ws: any | null = null
    private reconnectAttempts = 0
    private reconnectTimer: any = null

    constructor(id: string, opts?: AdapterOptions) {
        super(id, opts)
    }

    async connect(): Promise<void> {
        if (this.connected) return

        const base = this.options?.url ?? this.options?.ws ?? this.options?.endpoint
        if (!base) throw new Error('NapcatAdapter: missing url in options')
        const token = this.options?.token ?? this.options?.access_token ?? this.options?.accessToken
        const sep = base.includes('?') ? '&' : '?'
        const url = token ? `${base}${sep}access_token=${encodeURIComponent(token)}` : base

        // connection options
        const reconnect = this.options?.reconnect ?? true
        const maxRetries = typeof this.options?.maxRetries === 'number' ? this.options.maxRetries : 5
        const retryInterval = typeof this.options?.retryInterval === 'number' ? this.options.retryInterval : 2000

        // 动态加载 ws（在 Node 环境中可能没有全局 WebSocket）
        let WS: any = (globalThis as any).WebSocket
        if (!WS) {
            try {
                // @ts-ignore
                const mod = await import('ws')
                WS = mod?.default ?? mod?.WebSocket ?? mod
            } catch (e) {
                throw new Error('NapcatAdapter: ws not available and "ws" package not installed')
            }
        }

        const doConnect = (): Promise<void> => {
            return new Promise((resolve, _reject) => {
                try {
                    this.ws = new WS(url)

                    const onOpen = () => {
                        this.reconnectAttempts = 0
                        this.connected = true
                        this.emitEvent('connected', { id: this.id, source: this.id, timestamp: Date.now() })
                        cleanupListeners()
                        resolve()
                    }

                    const onMessage = (data: any) =>  this.emitEvent('get', { data: data, timestamp: Date.now() } as AdapterMessage)

                    const onClose = () => {
                        this.connected = false
                        this.emitEvent('disconnected', { id: this.id, source: this.id, timestamp: Date.now() })
                        cleanupListeners()
                        if (reconnect) scheduleReconnect()
                    }

                    const onError = (err: any) => {
                        this.emitEvent('error', { error: err })
                        // let close handle reconnect
                    }

                    const cleanupListeners = () => {
                        try {
                            if (!this.ws) return
                            if (typeof this.ws.removeEventListener === 'function') {
                                this.ws.removeEventListener('open', onOpen as any)
                                this.ws.removeEventListener('message', onMessage as any)
                                this.ws.removeEventListener('close', onClose as any)
                                this.ws.removeEventListener('error', onError as any)
                            }
                            if (typeof this.ws.off === 'function') {
                                this.ws.off('open', onOpen)
                                this.ws.off('message', onMessage)
                                this.ws.off('close', onClose)
                                this.ws.off('error', onError)
                            }
                        } catch (e) { /* ignore */ }
                    }

                    const scheduleReconnect = () => {
                        if (!reconnect) return
                        this.reconnectAttempts++
                        if (this.reconnectAttempts > maxRetries) return
                        const delay = retryInterval * this.reconnectAttempts
                        this.reconnectTimer = setTimeout(() => {
                            doConnect().catch(() => { /* swallow */ })
                        }, delay)
                    }

                    if (typeof this.ws.addEventListener === 'function') {
                        this.ws.addEventListener('open', onOpen as any)
                        this.ws.addEventListener('message', (ev: any) => onMessage(ev?.data ?? ev))
                        this.ws.addEventListener('close', onClose as any)
                        this.ws.addEventListener('error', onError as any)
                    } else if (typeof this.ws.on === 'function') {
                        this.ws.on('open', onOpen)
                        this.ws.on('message', onMessage)
                        this.ws.on('close', onClose)
                        this.ws.on('error', onError)
                    }
                } catch (err) {
                    // ignore; schedule reconnect via outer handlers
                }
            })
        }

        await doConnect()
    }

    async disconnect(): Promise<void> {
    if (!this.ws) return
    try { if (typeof this.ws.close === 'function') this.ws.close() } catch (e) { void e }
        this.clearReconnect()
        this.ws = null
        this.connected = false
        this.emitEvent('disconnected', { id: this.id, source: this.id, timestamp: Date.now() })
    }

    private clearReconnect() {
    try { if (this.reconnectTimer) {clearTimeout(this.reconnectTimer); this.reconnectTimer = null } } catch (e) { void e }
        this.reconnectAttempts = 0
    }

    async send(message: AdapterMessage): Promise<void> {
        if (!this.ws || !this.connected) throw new Error('NapcatAdapter: not connected')
        const payload = JSON.stringify(message)
        if (typeof this.ws.send === 'function') {
            this.ws.send(payload)
        } else if (typeof this.ws.send === 'undefined' && typeof this.ws.dispatchEvent === 'function') {
            (this.ws as any).send(payload)
        } else {
            throw new Error('NapcatAdapter: ws send not supported')
        }
    }

    // 工具方法 ==================================================

    messageMapping = {
        messageId: 'message_id',
        messageSeqId: { path: 'real_seq',
            transform: (val: any) => Number(val) },
        messageType: 'message_type',
        selfId: 'self_id',
        groupId: 'group_id',
        userId: 'user_id',
        targetId: 'target_id',
        'sender.userId': 'sender.user_id',
        'sender.nickName': 'sender.nickname',
        'sender.cardName': 'sender.card',
        'sender.role': 'sender.role',
        rawMessage: 'raw_message',
        time: { path: 'time',
            transform: (val: any) => new Date(val * 1000) },
        message: {
            path: 'message',
            transform: (val: {[key: string]: any}[]) => {
                const finalItems: any[] = []
                for (const item of val) {
                    const result: {[key: string]: any} = {
                        type: item.type
                    }
                    switch(item.type) {
                        case 'text': result.text = item.data.text; break;
                        case 'image': {
                            result.url = item.data.url
                            result.summary = item.data.summary
                            result.subType = item.data.sub_type
                            if(item.data.emoji_id) {
                                result.emojiId = item.data.emoji_id
                                result.packageId = item.data.package_id
                            }
                            break;
                        }
                        case 'reply': result.id = item.data.id; break;
                        default: continue;
                    }
                    finalItems.push(result)
                }
                return finalItems
            }
        }
    }  as Mapping

    private formatMessage(data: any[]) {
        return data.map(item => {
            return mapToInterface<RenMessage>(item, this.messageMapping)
        })
    }

    // 事件实现 ==================================================

    @event('get')
    async get(msg: AdapterMessage) {
        let data = JSON.parse(msg.data)
        // 对原始消息进行拆分二次投递事件
        const msgType = data.post_type === 'notice' ? data.sub_type ?? data.notice_type : data.post_type
        if(msgType == 'message') {
            data = this.formatMessage([data])
            this.emitEvent('message', data[0])
        } else if(msgType == 'message_sent') {
            data = this.formatMessage([data])
            this.emitEvent('message_mine', data[0])
        }
        return { ok: true }
    }

    // 接口实现 ==================================================
}

export default NapcatAdapter
