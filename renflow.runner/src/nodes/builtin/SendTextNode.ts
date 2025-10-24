import { BaseNode } from '../BaseNode.js'
import type { NodeMetadata, NodeContext, NodeExecutionResult } from '../types.js'

/**
 * 发送文本消息节点
 * 用于向用户或群组发送文本消息
 */
export class SendTextNode extends BaseNode {
    metadata: NodeMetadata = {
        id: 'send-text',
        name: '发送文本消息',
        description: '发送文本消息到指定目标',
        category: 'bot',
        icon: 'comment',
        params: [
            {
                key: 'text',
                label: '消息内容',
                type: 'textarea',
                placeholder: '输入要发送的文本消息',
                defaultValue: '{data.text}',
                required: true,
                dynamic: true
            }
        ],
        outputSchema: [
            {
                key: 'text',
                label: '消息内容',
                type: 'string',
                description: '发送的文本消息内容'
            },
            {
                key: 'sent',
                label: '发送状态',
                type: 'boolean',
                description: '消息是否成功发送'
            },
            {
                key: 'message',
                label: '状态信息',
                type: 'string',
                description: '发送结果的状态信息'
            }
        ]
    }

    async execute(
        input: any,
        params: Record<string, any>,
        context: NodeContext
    ): Promise<NodeExecutionResult> {
        const text = params.text || '{data.text}'

        // 解析 {data.text} 占位符
        let messageText = text
        if (text === '{data.text}' && input) {
            // 如果是默认占位符且有输入数据，使用输入数据
            if (typeof input === 'string') {
                messageText = input
            } else if (input.text) {
                messageText = input.text
            } else {
                // 尝试转换为字符串
                messageText = JSON.stringify(input)
            }
        }

        context.logger.log(`[发送文本消息] 准备发送: ${messageText}`)

        // TODO: 实现实际的消息发送逻辑
        // 这里需要调用 OneBot 协议的发送消息接口
        // 例如: await backend.call('onebot:sendMessage', { text: messageText, target: ... })

        return {
            success: true,
            output: {
                text: messageText,
                sent: false, // TODO: 实际发送后改为 true
                message: '消息发送功能待实现'
            }
        }
    }
}
