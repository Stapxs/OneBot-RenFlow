import { BaseNode } from '../BaseNode.js'
import type { NodeMetadata, NodeContext, NodeExecutionResult } from '../types.js'

/**
 *  日志节点
 */

/* eslint-disable no-console */
export class ConsoleNode extends BaseNode {
    metadata: NodeMetadata = {
        id: 'console-log',
        name: '日志',
        description: '将内容写入到运行日志中',
        category: 'output',
        icon: 'terminal',
        params: [
            {
                key: 'message',
                label: '输出内容',
                type: 'input',
                required: true,
                placeholder: '请输入要输出的内容',
                dynamic: true
            },
            {
                key: 'logLevel',
                label: '日志级别',
                type: 'select',
                defaultValue: 'log',
                options: [
                    { label: '普通', value: 'log' },
                    { label: '警告', value: 'warn' },
                    { label: '错误', value: 'error' }
                ]
            },
            {
                key: 'includeInput',
                label: '包含输入',
                type: 'switch',
                defaultValue: true
            }
        ],
        outputSchema: [
            {
                key: 'logs',
                label: '日志内容',
                type: 'string',
                description: '输出的日志内容'
            },
            {
                key: 'input',
                label: '原始输入',
                type: 'any',
                description: '透传的上游节点输出数据'
            }
        ]
    }

    async execute(
        input: any,
        params: Record<string, any>,
        context: NodeContext
    ): Promise<NodeExecutionResult> {
        const { message, logLevel = 'log', includeInput = false } = params

        // 构建输出内容
        let outputMessage = message

        if (includeInput) {
            outputMessage = `${message} | 输入数据: ${JSON.stringify(input)}`
        }

        // 根据日志级别输出
        switch (logLevel) {
            case 'warn':
                context.logger.warn(outputMessage)
                if (includeInput) {
                    console.warn(message, input)
                } else {
                    console.warn(message)
                }
                break
            case 'error':
                context.logger.error(outputMessage)
                if (includeInput) {
                    console.error(message, input)
                } else {
                    console.error(message)
                }
                break
            default:
                context.logger.log(outputMessage)
                if (includeInput) {
                    console.log(message, input)
                } else {
                    console.log(message)
                }
        }

        return {
            success: true,
            output: input // 将输入数据传递到下一个节点
        }
    }
}
