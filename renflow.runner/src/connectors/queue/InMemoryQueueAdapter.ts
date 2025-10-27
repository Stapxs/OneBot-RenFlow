// 内存队列适配器（基于 fastq）
// 说明：
// - 用于开发环境和单进程运行的轻量队列实现，默认使用 fastq 作为底层任务队列。
// - 实现了 enqueue、startWorker、close、on/off 与简单的重试逻辑。
// - 设计为可替换的 QueueAdapter，生产环境可替换为 RabbitMQ/BullMQ 等后端。

import fastq from 'fastq'
import { v4 as uuidv4 } from 'uuid'
import type { QueueAdapter } from './QueueAdapter'
import type { QueueMessage, EnqueueOptions, QueueStats, QueueEvent } from './types'
import { eventBus } from '../eventbus'

type WorkerTask = { id: string; msg: QueueMessage; attemptsLeft: number }

export class InMemoryQueueAdapter implements QueueAdapter {
    private concurrency: number
    private queue: any
    private handlers: Record<string, Set<any>> = {}
    private statsState = { waiting: 0, active: 0, completed: 0, failed: 0 }
    private workerHandler: ((msg: QueueMessage) => Promise<void>) | null = null
    private adapterId: string

    constructor(concurrency = 1, adapterId = 'inmemory') {
        this.concurrency = concurrency
        this.adapterId = adapterId
        // 创建 fastq 队列，worker 函数为 _processTask
        this.queue = fastq(this, this._processTask.bind(this), this.concurrency)
    }

    async enqueue(msg: QueueMessage, opts?: EnqueueOptions): Promise<string> {
        // 将消息入列，返回 job id
        // 支持 delay 与 attempts
        const id = msg.id || uuidv4()
        const attempts = opts?.attempts ?? 1

        const task: WorkerTask = { id, msg: { ...msg, id }, attemptsLeft: attempts }

        if (opts?.delay && opts.delay > 0) {
            // 延迟入列
            setTimeout(() => {
                this.queue.push(task)
            }, opts.delay)
        } else {
            this.queue.push(task)
        }

        // 更新统计
        this.statsState.waiting += 1

        return id
    }

    startWorker(handler: (msg: QueueMessage) => Promise<void>, opts?: { concurrency?: number }): void {
        // 注册处理函数，并支持动态调整并发（通过重建队列）
        this.workerHandler = handler
        if (opts?.concurrency && opts.concurrency !== this.concurrency) {
            this.concurrency = opts.concurrency
            // fastq 不直接提供修改并发的 API，重新创建队列
            this.queue = fastq(this, this._processTask.bind(this), this.concurrency)
        }
    }

    async close(): Promise<void> {
        // 等待队列处理完成后关闭
        await new Promise<void>((resolve) => {
            this.queue.drain = () => resolve()
            if (this.queue.running() === 0) resolve()
        })
    }

    on(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void {
        this.handlers[event] = this.handlers[event] || new Set()
        this.handlers[event].add(handler)
    }

    off(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void {
        this.handlers[event]?.delete(handler)
    }

    async stats(): Promise<QueueStats> {
        // 返回当前统计快照
        return { ...this.statsState }
    }

    private _emit(event: QueueEvent, jobId: string, msg?: QueueMessage) {
        const hs = this.handlers[event]
        if (hs) {
            for (const h of hs) {
                try { h(jobId, msg) } catch (e) { /* swallow */ }
            }
        }
        // 同步发往全局 EventBus，便于系统观察与外部扩展
        try {
            eventBus.publish({
                id: jobId,
                source: this.adapterId,
                type: `queue.${event}`,
                payload: { msg },
                timestamp: Date.now(),
            })
        } catch (e) { /* ignore bus errors */ }
    }

    private async _processTask(task: WorkerTask, cb: (err?: any) => void) {
        // 处理任务：更新统计并调用注册的 workerHandler
        this.statsState.waiting = Math.max(0, this.statsState.waiting - 1)
        this.statsState.active += 1
        this._emit('active', task.id, task.msg)

        if (!this.workerHandler) {
            // 没有注册处理函数，直接失败
            this.statsState.active = Math.max(0, this.statsState.active - 1)
            this.statsState.failed += 1
            this._emit('failed', task.id, task.msg)
            return cb(new Error('No worker handler'))
        }

        try {
            await this.workerHandler(task.msg)
            this.statsState.active = Math.max(0, this.statsState.active - 1)
            this.statsState.completed += 1
            this._emit('completed', task.id, task.msg)
            cb()
        } catch (err) {
            // 处理出错：尝试重试或标记失败
            task.attemptsLeft -= 1
            this.statsState.active = Math.max(0, this.statsState.active - 1)
            if (task.attemptsLeft > 0) {
                // 简单退避后重试
                setTimeout(() => {
                    this.queue.push(task)
                }, 1000)
                this.statsState.waiting += 1
                this._emit('waiting', task.id, task.msg)
                cb()
            } else {
                this.statsState.failed += 1
                this._emit('failed', task.id, task.msg)
                cb(err)
            }
        }
    }
}

export default InMemoryQueueAdapter
