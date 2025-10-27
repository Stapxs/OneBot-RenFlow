/**
 * RabbitMQ 队列适配器（可选）
 *
 * 实现说明：
 * - 使用 amqplib 连接到 RabbitMQ，提供最小的 enqueue / startWorker / close / on / off / stats 接口。
 * - 本实现只关注基本功能：发送 JSON 消息到指定队列，和从队列消费消息。
 * - 生产环境中可以扩展事务、确认模式（manualAck）、死信队列、延迟队列（插件）等。
 */

import * as amqp from 'amqplib'
import type { QueueAdapter } from './QueueAdapter'
import type { QueueMessage, EnqueueOptions, QueueStats, QueueEvent } from './types'
import { eventBus } from '../eventbus'

// amqplib 的类型在运行时可能不存在，这里使用 any 来减少类型依赖
type Connection = any
type Channel = any
type ConsumeMessage = any

export interface RabbitOptions {
    url: string
    queueName: string
    prefetch?: number
}

export class RabbitMQQueueAdapter implements QueueAdapter {
    private opts: RabbitOptions
    private conn: Connection | null = null
    private ch: Channel | null = null
    private handlers: Record<string, Set<any>> = {}
    private consumerTag: string | null = null
    private adapterId: string

    constructor(opts: RabbitOptions, adapterId = 'rabbitmq') {
        this.opts = opts
        this.adapterId = adapterId
    }

    // 建立与 RabbitMQ 的连接并声明队列
    async ensureConnected() {
        if (this.conn && this.ch) return
        this.conn = await amqp.connect(this.opts.url)
        this.ch = await this.conn.createChannel()
        await this.ch.assertQueue(this.opts.queueName, { durable: true })
        if (this.opts.prefetch) {
            this.ch.prefetch(this.opts.prefetch)
        }
    }

    async enqueue(msg: QueueMessage, _opts?: EnqueueOptions): Promise<string> {
        await this.ensureConnected()
        const id = msg.id || (Date.now().toString() + Math.random().toString(36).slice(2, 8))
        const payload = Buffer.from(JSON.stringify({ ...msg, id }))

        // 发送消息到队列（持久化）
        this.ch!.sendToQueue(this.opts.queueName, payload, { persistent: true })
        return id
    }

    startWorker(handler: (msg: QueueMessage) => Promise<void>, _opts?: { concurrency?: number }): void {
        // 启动消费者；这里只做最简实现，消费后自动 ack
        (async () => {
            await this.ensureConnected()
            if (!this.ch) return
            const consume = async (msg: ConsumeMessage | null) => {
                if (!msg) return
                try {
                    const body = JSON.parse(msg.content.toString()) as QueueMessage
                    await handler(body)
                    this.ch!.ack(msg)
                    this._emit('completed', body.id || '', body)
                } catch (err) {
                    // 发生错误：尝试 nack 并发出 failed 事件
                    try { this.ch!.nack(msg, false, false) } catch (e) { /* ignore */ }
                    const id = (msg.content && JSON.parse(msg.content.toString()).id) || ''
                    this._emit('failed', id)
                }
            }

            const r = await this.ch.consume(this.opts.queueName, consume)
            this.consumerTag = r.consumerTag
        })().catch(() => {
            // 连接/消费失败，转为 failed 事件
            this._emit('failed', '', undefined)
        })
    }

    async close(): Promise<void> {
        try {
            if (this.ch) {
                if (this.consumerTag) await this.ch.cancel(this.consumerTag)
                await this.ch.close()
                this.ch = null
            }
            if (this.conn) {
                await this.conn.close()
                this.conn = null
            }
        } catch (e) {
            // 忽略关闭错误
        }
    }

    on(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void {
        this.handlers[event] = this.handlers[event] || new Set()
        this.handlers[event].add(handler)
    }

    off(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void {
        this.handlers[event]?.delete(handler)
    }

    async stats(): Promise<QueueStats> {
        // 尝试通过 assertQueue 获取消息计数（注意：此为近似值）
        if (!this.ch) await this.ensureConnected()
        const q = await this.ch!.assertQueue(this.opts.queueName, { durable: true })
        return { waiting: q.messageCount, active: q.consumerCount, completed: 0, failed: 0 }
    }

    private _emit(event: QueueEvent, jobId: string, msg?: QueueMessage) {
        const hs = this.handlers[event]
        if (hs) {
            for (const h of hs) {
                try { h(jobId, msg) } catch (e) { /* swallow */ }
            }
        }
        try {
            eventBus.publish({
                id: jobId,
                source: this.adapterId,
                type: `queue.${event}`,
                payload: { msg },
                timestamp: Date.now(),
            })
        } catch (e) { /* ignore */ }
    }
}

export default RabbitMQQueueAdapter
