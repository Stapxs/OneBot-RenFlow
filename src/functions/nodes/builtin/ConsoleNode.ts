import { BaseNode } from '../BaseNode'
import type { NodeMetadata, NodeContext, NodeExecutionResult } from '../types'

/**
 * 控制台输出节点
 * 将用户输入的内容输出到控制台
 */
export class ConsoleNode extends BaseNode {
    metadata: NodeMetadata = {
        id: 'console-log',
        name: '控制台输出',
        description: '将内容输出到浏览器控制台',
        category: 'output',
        params: [
            {
                key: 'message',
                label: '输出内容',
                type: 'input',
                required: true,
                placeholder: '请输入要输出的内容'
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
                label: '包含输入数据',
                type: 'switch',
                defaultValue: false
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
                break
            case 'error':
                context.logger.error(outputMessage)
                break
            default:
                context.logger.log(outputMessage)
        }

        return {
            success: true,
            output: input // 将输入数据传递到下一个节点
        }
    }
}
