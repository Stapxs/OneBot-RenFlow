/**
 * 工作流执行引擎
 * 负责执行转换后的工作流
 */

import type { WorkflowExecution, ExecutionNode } from './types.js'
import type { NodeContext, NodeExecutionResult } from '../nodes/types.js'
import { NodeManager } from '../nodes/NodeManager.js'
import { Logger } from '../utils/logger.js'

/**
 * 执行上下文
 */
export interface ExecutionContext {
    /** 工作流 ID */
    workflowId: string
    /** 全局状态 */
    globalState: Map<string, any>
    /** 触发数据（来自触发器的输入） */
    triggerData: any
    /** 执行日志 */
    logs: ExecutionLog[]
}

/**
 * 执行日志
 */
export interface ExecutionLog {
    /** 时间戳 */
    timestamp: number
    /** 节点 ID */
    nodeId: string
    /** 日志级别 */
    level: 'log' | 'error' | 'warn'
    /** 日志消息 */
    message: string
    /** 额外数据 */
    data?: any
}

/**
 * 执行结果
 */
export interface WorkflowExecutionResult {
    /** 是否执行成功 */
    success: boolean
    /** 错误信息 */
    error?: string
    /** 执行日志 */
    logs: ExecutionLog[]
    /** 最终状态 */
    finalState: Map<string, any>
}

/**
 * 执行状态回调
 */
export interface ExecutionCallback {
    /** 节点开始执行 */
    onNodeStart?: (nodeId: string, nodeType: string) => void | Promise<void>
    /** 节点执行完成 */
    onNodeComplete?: (nodeId: string, result: NodeExecutionResult) => void | Promise<void>
    /** 节点执行失败 */
    onNodeError?: (nodeId: string, error: Error) => void | Promise<void>
    /** 工作流执行完成 */
    onWorkflowComplete?: (result: WorkflowExecutionResult) => void | Promise<void>
}

/**
 * 执行选项
 */
export interface ExecutionOptions {
    /** 每个节点的最小执行延迟（毫秒），用于可视化 */
    minDelay?: number
    /** 执行超时时间（毫秒） */
    timeout?: number
    /** 状态回调 */
    callback?: ExecutionCallback
}

export class WorkflowEngine {
    private nodeManager: NodeManager
    private logger: Logger

    constructor() {
        this.nodeManager = new NodeManager()
        this.logger = new Logger('WorkflowEngine')
    }

    /**
     * 执行工作流
     * @param workflow 工作流执行数据
     * @param triggerData 触发数据
     * @param options 执行选项
     * @returns 执行结果
     */
    async execute(
        workflow: WorkflowExecution,
        triggerData: any = null,
        options: ExecutionOptions = {}
    ): Promise<WorkflowExecutionResult> {
        this.logger.info(`开始执行工作流: ${workflow.name} (${workflow.id})`)

        // 创建执行上下文
        const context: ExecutionContext = {
            workflowId: workflow.id,
            globalState: new Map(),
            triggerData,
            logs: []
        }

        const executePromise = this.executeInternal(workflow, context, options)

        // 如果设置了超时，使用 Promise.race
        if (options.timeout && options.timeout > 0) {
            const timeoutPromise = new Promise<WorkflowExecutionResult>((_, reject) => {
                setTimeout(() => reject(new Error(`执行超时 (${options.timeout}ms)`)), options.timeout)
            })

            try {
                return await Promise.race([executePromise, timeoutPromise])
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                this.logger.error(`工作流执行失败: ${errorMessage}`)

                const result: WorkflowExecutionResult = {
                    success: false,
                    error: errorMessage,
                    logs: context.logs,
                    finalState: context.globalState
                }

                await options.callback?.onWorkflowComplete?.(result)
                return result
            }
        }

        return executePromise
    }

    /**
     * 内部执行方法
     */
    private async executeInternal(
        workflow: WorkflowExecution,
        context: ExecutionContext,
        options: ExecutionOptions
    ): Promise<WorkflowExecutionResult> {
        try {
            // 检查入口节点
            if (!workflow.entryNode) {
                throw new Error('工作流没有入口节点')
            }

            // 从入口节点开始执行
            await this.executeNode(
                workflow.entryNode,
                context.triggerData,
                workflow,
                context,
                options
            )

            this.logger.info(`工作流执行完成: ${workflow.name}`)

            const result: WorkflowExecutionResult = {
                success: true,
                logs: context.logs,
                finalState: context.globalState
            }

            await options.callback?.onWorkflowComplete?.(result)
            return result
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            this.logger.error(`工作流执行失败: ${errorMessage}`)

            const result: WorkflowExecutionResult = {
                success: false,
                error: errorMessage,
                logs: context.logs,
                finalState: context.globalState
            }

            await options.callback?.onWorkflowComplete?.(result)
            return result
        }
    }

    /**
     * 执行单个节点
     */
    private async executeNode(
        nodeId: string,
        input: any,
        workflow: WorkflowExecution,
        context: ExecutionContext,
        options: ExecutionOptions
    ): Promise<void> {
        const node = workflow.nodes[nodeId]
        if (!node) {
            throw new Error(`节点不存在: ${nodeId}`)
        }

        const startTime = Date.now()

        try {
            this.logger.info(`执行节点: ${nodeId} (${node.type})`)

            // 触发节点开始回调
            await options.callback?.onNodeStart?.(nodeId, node.type)

            // 创建节点上下文
            const nodeContext: NodeContext = {
                nodeId: node.id,
                globalState: context.globalState,
                logger: {
                    log: (...args: any[]) => {
                        this.addLog(context, nodeId, 'log', args.join(' '))
                    },
                    error: (...args: any[]) => {
                        this.addLog(context, nodeId, 'error', args.join(' '))
                    },
                    warn: (...args: any[]) => {
                        this.addLog(context, nodeId, 'warn', args.join(' '))
                    }
                }
            }

            // 执行节点
            const result = await this.nodeManager.executeNode(
                node.type,
                input,
                node.params,
                nodeContext
            )

            // 记录执行结果
            if (!result.success) {
                throw new Error(`节点执行失败: ${result.error}`)
            }

            // 计算延迟时间
            const elapsed = Date.now() - startTime
            const minDelay = options.minDelay || 0
            if (minDelay > elapsed) {
                await this.delay(minDelay - elapsed)
            }

            this.logger.info(`节点执行成功: ${nodeId}`)

            // 触发节点完成回调
            await options.callback?.onNodeComplete?.(nodeId, result)

            // 执行下一个节点
            await this.executeNextNodes(node, result, workflow, context, options)
        } catch (error) {
            // 触发节点错误回调
            const err = error instanceof Error ? error : new Error(String(error))
            await options.callback?.onNodeError?.(nodeId, err)
            throw error
        }
    }

    /**
     * 执行下一个节点
     */
    private async executeNextNodes(
        node: ExecutionNode,
        result: NodeExecutionResult,
        workflow: WorkflowExecution,
        context: ExecutionContext,
        options: ExecutionOptions
    ): Promise<void> {
        // 如果是条件节点，根据结果选择分支
        if (node.branches) {
            await this.executeBranch(node, result, workflow, context, options)
        } else if (node.next.length > 0) {
            // 普通节点：并行执行所有下一个节点（非列队）
            // 使用 Promise.all 保证并行执行并在任一子任务抛出错误时向上抛出
            const executions = node.next.map(nextId =>
                this.executeNode(nextId, result.output, workflow, context, options)
            )

            await Promise.all(executions)
        }
        // 如果 next 为空，说明到达流程终点
    }

    /**
     * 执行条件分支
     */
    private async executeBranch(
        node: ExecutionNode,
        result: NodeExecutionResult,
        workflow: WorkflowExecution,
        context: ExecutionContext,
        options: ExecutionOptions
    ): Promise<void> {
        if (!node.branches) return

        // 根据节点类型处理分支
        if (node.type === 'if-else') {
            // if-else 节点：根据输出的布尔值选择分支
            const condition = result.output._branch
            const branchKey = condition ? 'true' : 'false'
            const nextNodeId = node.branches[branchKey]

            if (nextNodeId) {
                await this.executeNode(nextNodeId, result.output, workflow, context, options)
            } else {
                this.logger.info(`分支 ${branchKey} 没有连接节点，流程结束`)
            }
        } else {
            // 其他条件节点：使用 output 作为分支键
            const branchKey = String(result.output)
            const nextNodeId = node.branches[branchKey] || node.branches['default']

            if (nextNodeId) {
                await this.executeNode(nextNodeId, result.output, workflow, context, options)
            } else {
                this.logger.info(`没有匹配的分支: ${branchKey}，流程结束`)
            }
        }
    }

    /**
     * 添加执行日志
     */
    private addLog(
        context: ExecutionContext,
        nodeId: string,
        level: 'log' | 'error' | 'warn',
        message: string,
        data?: any
    ): void {
        context.logs.push({
            timestamp: Date.now(),
            nodeId,
            level,
            message,
            data
        })
    }

    /**
     * 延迟函数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}
