import type { NodeMetadata, NodeContext, NodeExecutionResult } from './types'

/**
 * 节点基类
 */
export abstract class BaseNode {
    /** 节点元数据 */
    abstract metadata: NodeMetadata

    /**
     * 执行节点
     * @param input 输入数据
     * @param params 节点参数（用户配置的参数值）
     * @param context 执行上下文
     * @returns 执行结果
     */
    abstract execute(
        input: any,
        params: Record<string, any>,
        context: NodeContext
    ): Promise<NodeExecutionResult>

    /**
     * 验证参数
     * @param params 参数对象
     * @returns 验证结果，如果验证失败返回错误信息
     */
    protected validateParams(params: Record<string, any>): string | null {
        for (const paramConfig of this.metadata.params) {
            if (paramConfig.required && !params[paramConfig.key]) {
                return `参数 "${paramConfig.label}" 是必填项`
            }
        }
        return null
    }

    /**
     * 安全执行节点（包含错误处理）
     * @param input 输入数据
     * @param params 节点参数
     * @param context 执行上下文
     * @returns 执行结果
     */
    async safeExecute(
        input: any,
        params: Record<string, any>,
        context: NodeContext
    ): Promise<NodeExecutionResult> {
        try {
            // 验证参数
            const validationError = this.validateParams(params)
            if (validationError) {
                return {
                    success: false,
                    error: validationError
                }
            }

            // 执行节点
            return await this.execute(input, params, context)
        } catch (error) {
            context.logger.error(this.metadata.name, error)
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }
        }
    }
}
