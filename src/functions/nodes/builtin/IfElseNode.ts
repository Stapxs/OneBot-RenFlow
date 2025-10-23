import { BaseNode } from '../BaseNode'
import type { NodeMetadata, NodeContext, NodeExecutionResult } from '../types'

/**
 * If-Else 条件分支节点
 * 根据条件表达式判断执行哪个分支
 */
export class IfElseNode extends BaseNode {
    metadata: NodeMetadata = {
        id: 'if-else',
        name: '条件分支',
        description: '根据条件判断执行不同分支',
        category: 'flow',
        icon: 'code-branch',
        params: [
            {
                key: 'title',
                label: '节点标题',
                type: 'input',
                placeholder: '条件分支',
                defaultValue: '条件分支'
            },
            {
                key: 'condition',
                label: '条件表达式',
                type: 'textarea',
                placeholder: '// 返回 true 或 false\n// 可用变量:\n// - input: 输入数据\n// - context: 执行上下文\n\nreturn input.value > 10',
                defaultValue: 'return true',
                required: true
            }
        ]
    }

    async execute(
        input: any,
        params: Record<string, any>,
        context: NodeContext
    ): Promise<NodeExecutionResult> {
        const condition = params.condition || 'return true'

        try {
            // 执行条件表达式
            const conditionFunc = new Function('input', 'context', condition)
            const result = await conditionFunc(input, context)

            const isTrue = Boolean(result)

            context.logger.log(`[If-Else] 条件判断: ${isTrue ? 'true (走 true 分支)' : 'false (走 false 分支)'}`)

            return {
                success: true,
                output: {
                    ...input,
                    _branch: isTrue ? 'true' : 'false', // 标记走的分支
                    _conditionResult: isTrue
                }
            }
        } catch (error: any) {
            context.logger.error('[If-Else] 条件判断失败:', error.message)

            return {
                success: false,
                error: `条件表达式错误: ${error.message}`,
                output: null
            }
        }
    }
}
