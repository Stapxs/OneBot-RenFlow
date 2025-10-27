import type { QueueMessage, EnqueueOptions, QueueStats, QueueEvent } from './types'

export interface QueueAdapter {
    enqueue(msg: QueueMessage, opts?: EnqueueOptions): Promise<string>
    startWorker(handler: (msg: QueueMessage) => Promise<void>, opts?: { concurrency?: number }): void
    close(): Promise<void>
    on(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void
    off(event: QueueEvent, handler: (jobId: string, msg?: QueueMessage) => void): void
    stats(): Promise<QueueStats>
}

export default QueueAdapter
