import { BaseBotAdapter } from '../BotAdapter'
import type { AdapterOptions, AdapterMessage } from '../types'
import { api } from '../decorators'

/**
 * NapcatAdapter: OneBot 协议适配器（Napcat 风格的 websocket 接入）
 * 连接将使用 `${url}?access_token=${token}`
 */
export class NapcatAdapter extends BaseBotAdapter {
    private ws: any | null = null
    private reconnectAttempts = 0
    private reconnectTimer: any = null
    private heartbeatTimer: any = null
    private lastPongAt = 0

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
        const heartbeatInterval = typeof this.options?.heartbeatInterval === 'number' ? this.options.heartbeatInterval : 15000
        const heartbeatPayload = this.options?.heartbeatPayload ?? { type: 'ping' }

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
                        this.startHeartbeat(heartbeatInterval, heartbeatPayload)
                        cleanupListeners()
                        resolve()
                    }

                    const onMessage = (data: any) => { this.handleRawMessage(data) }

                    const onClose = () => {
                        this.connected = false
                        this.stopHeartbeat()
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
        this.stopHeartbeat()
        this.ws = null
        this.connected = false
        this.emitEvent('disconnected', { id: this.id, source: this.id, timestamp: Date.now() })
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

    // 实现 BaseBotAdapter 要求的 message API，并通过 @api 暴露
    @api('message')
    async message(msg: AdapterMessage) {
        await this.send(msg)
        return { ok: true }
    }

    private startHeartbeat(interval: number, payload: any) {
        try {
            this.stopHeartbeat()
            this.heartbeatTimer = setInterval(() => {
                try {
                    if (!this.ws || !this.connected) return
                    const p = typeof payload === 'string' ? payload : JSON.stringify(payload)
                    if (typeof this.ws.send === 'function') this.ws.send(p)
                } catch (e) { /* ignore */ }
            }, interval)
        } catch (e) { /* ignore */ }
    }

    private stopHeartbeat() {
    try { if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null } } catch (e) { void e }
    }

    private clearReconnect() {
    try { if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null } } catch (e) { void e }
        this.reconnectAttempts = 0
    }

    private handleRawMessage(raw: any) {
        let data: any = raw
        try {
            if (typeof raw === 'string') data = JSON.parse(raw)
            else if (raw && typeof raw === 'object' && raw.toString && raw instanceof Uint8Array) {
                const s = Buffer.from(raw).toString('utf8')
                try { data = JSON.parse(s) } catch { data = s }
            }
        } catch (e) {
            data = raw
        }

        // detect pong/heartbeat responses
        if (data && data.type === 'pong') {
            this.lastPongAt = Date.now()
            return
        }

        const msg: AdapterMessage = {
            id: data?.message_id ?? data?.id ?? undefined,
            from: data?.from ?? data?.user ?? 'remote',
            to: data?.to ?? undefined,
            text: data?.text ?? data?.content ?? (typeof data === 'string' ? data : undefined),
            raw: data,
            timestamp: Date.now(),
        }

        this.emitEvent('message', msg)
    }
}

export default NapcatAdapter
