/**
 * Workflow 模块导出
 */

import jp from 'jsonpath'
import shellQuote from 'shell-quote'
import parseArgs from 'yargs-parser'

import { RenMessage, WorkflowConverter, WorkflowEngine, WorkflowExecutionResult } from '../index.js'
import { Logger } from '../utils/logger.js'
import { WorkflowExecution } from './types.js'

export * from './types.js'
export * from './converter.js'
export * from './engine.js'

/**
 * 运行工作流并处理回调
 * @param executionData 工作流执行数据
 * @param data 输入数据
 * @param configs 配置选项
 * @param callbacks 回调函数
 */
export async function runWorkflow(
    executionData: WorkflowExecution,
    data: any,
    configs?: { minDelay?: number; timeout?: number },
    callbacks?: {
        onNodeStart?: (nodeId: string) => void | Promise<void>
        onNodeComplete?: (nodeId: string) => void | Promise<void>
        onNodeError?: (nodeId: string, error: any) => void | Promise<void>
        onWorkflowComplete?: (result: WorkflowExecutionResult) => void | Promise<void>
    }
): Promise<void> {
    const workflowConverter = new WorkflowConverter()

    const validation = workflowConverter.validate(executionData)
    if (!validation.valid) {
        throw new Error('工作流执行数据验证失败: ' + JSON.stringify(validation.errors))
    }

    const triggerCheck = checkTriggerConfig(executionData.trigger.params, data)
    if (!triggerCheck) {
        const logger = new Logger('runWorkflow')
        logger.info(`工作流 ${executionData.id} 未通过触发验证，跳过执行。`)
        // 触发一下结束
        callbacks?.onWorkflowComplete && await callbacks.onWorkflowComplete({
            success: true,
            logs: [],
            finalState: new Map()
        })
        return
    }

    const engine = new WorkflowEngine()
    await engine.execute(executionData, data, {
        minDelay: configs?.minDelay || 1000,
        timeout: configs?.timeout || 60000,
        callback: {
            onNodeStart: async (nodeId: string) => {
                callbacks?.onNodeStart && await callbacks.onNodeStart(nodeId)
            },
            onNodeComplete: async (nodeId: string) => {
                callbacks?.onNodeComplete && await callbacks.onNodeComplete(nodeId)
            },
            onNodeError: async (nodeId: string, error: any) => {
                callbacks?.onNodeError && await callbacks.onNodeError(nodeId, error)
            },
            onWorkflowComplete: async (workflowResult: any) => {
                callbacks?.onWorkflowComplete && await callbacks.onWorkflowComplete(workflowResult)
            }
        }
    })
}

/**
 * 运行一组工作流（验证触发器筛选）
 * @param executionData 工作流执行数据数组
 * @param triggerData 触发数据
 * @param configs 配置选项
 * @param callbacks 回调函数
 */
export async function runWorkflowByTrigger(
    executionData: WorkflowExecution[],
    triggerData: any,
    configs?: { minDelay?: number; timeout?: number },
    callbacks?: {
        /**
         * 触发前检查，你可以通过返回 false 来阻止工作流执行
         * @param nodeId 节点 ID
         * @returns 是否允许执行该节点
         */
        onWorkflowStart?: (workflowId: string) => boolean | Promise<boolean>
        onNodeStart?: (workflowId: string, nodeId: string) => void | Promise<void>
        onNodeComplete?: (workflowId: string, nodeId: string) => void | Promise<void>
        onNodeError?: (workflowId: string, nodeId: string, error: any) => void | Promise<void>
        onWorkflowComplete?: (workflowId: string, result: WorkflowExecutionResult) => void | Promise<void>
    }
): Promise<void> {
    const converter = new WorkflowConverter()
    const logger = new Logger('runWorkflowByTrigger')

    for (const workflow of executionData) {
        // 在运行前验证执行数据
        const validation = converter.validate(workflow)
        if (!validation.valid) {
            logger.warn(`工作流 ${workflow.id} 验证失败: ${JSON.stringify(validation.errors)}。跳过执行。`)
            continue
        }

        if (callbacks?.onWorkflowStart) {
            const allow = await callbacks.onWorkflowStart(workflow.id)
            if (!allow) {
                logger.info('工作流未执行， onWorkflowStart 回调阻止了执行。')
                continue
            }
        }
        runWorkflow(workflow, triggerData, configs, {
            onNodeStart(nodeId) {
                return callbacks?.onNodeStart ? callbacks.onNodeStart(workflow.id, nodeId) : undefined
            },
            onNodeComplete(nodeId) {
                return callbacks?.onNodeComplete ? callbacks.onNodeComplete(workflow.id, nodeId) : undefined
            },
            onNodeError(nodeId, error) {
                return callbacks?.onNodeError ? callbacks.onNodeError(workflow.id, nodeId, error) : undefined
            },
            onWorkflowComplete(result) {
                return callbacks?.onWorkflowComplete ? callbacks.onWorkflowComplete(workflow.id, result) : undefined
            }
        })
    }
}

function checkTriggerConfig(params: any, data: any) {
    // 获取触发器配置，进行触发验证
    let triggered = false
    const triggerConfig = params
    if(triggerConfig) {
        try {
            // 获取 triggerConfig.filterParam 对应的字段内容
            const results = jp.query(data, triggerConfig.filterParam)
            const className = data.__meta__?.className || data.constructor?.name
            // 消息匹配处理
            if (results.length == 1 && className === 'RenMessage') {
                if(!triggerConfig.includeSelf && (results[0] as RenMessage).isMine) {
                    throw new Error('跳过自己发送的消息')
                }
                const message = data as RenMessage
                const text = RenMessage.getTextContent(message.message)
                switch (triggerConfig.filterMode) {
                    case 'regex': {
                        const regex = new RegExp(triggerConfig.regexExpression)
                        triggered = regex.test(text)
                        break
                    }
                    // case 'shell': {

                    // }
                }
            }
        } catch (error) {
            throw new Error('触发器验证出错: ' + String(error))
        }
    }

    return triggered
}
