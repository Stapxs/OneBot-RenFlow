/**
 * 节点参数类型
 */
export type NodeParamType = 'input' | 'switch' | 'textarea' | 'number' | 'select' | 'settings'

/**
 * 节点参数配置
 */
export interface NodeParam {
    /** 参数 key */
    key: string
    /** 参数显示名称 */
    label: string
    /** 参数类型 */
    type: NodeParamType
    /** 默认值 */
    defaultValue?: any
    /** 是否必填 */
    required?: boolean
    /** 提示信息 */
    placeholder?: string
    /** 下拉选项（type 为 select 时使用） */
    options?: Array<{ label: string; value: any }>
}

/**
 * 节点分类（用于 UI 展示分组）
 */
export type NodeCategory = 'input' | 'output' | 'transform' | 'control' | 'logic' | 'data' | 'network' | 'bot' | 'flow' | 'custom'

/**
 * 节点分类信息
 */
export interface NodeCategoryInfo {
    id: NodeCategory
    name: string
    description: string
    icon?: string
}

/**
 * 节点元数据
 */
export interface NodeMetadata {
    /** 节点类型 ID */
    id: string
    /** 节点显示名称 */
    name: string
    /** 节点描述 */
    description: string
    /** 节点分类（用于 UI 展示分组） */
    category: NodeCategory
    /** 节点参数配置 */
    params: NodeParam[]
    /** 是否为自定义节点 */
    isCustom?: boolean
    /** 节点图标（可选） */
    icon?: string
}

/**
 * 节点执行上下文
 */
export interface NodeContext {
    /** 节点 ID */
    nodeId: string
    /** 全局状态（可用于节点间共享数据） */
    globalState: Map<string, any>
    /** 日志记录器 */
    logger: {
        log: (...args: any[]) => void
        error: (...args: any[]) => void
        warn: (...args: any[]) => void
    }
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
    /** 是否执行成功 */
    success: boolean
    /** 输出数据 */
    output?: any
    /** 错误信息 */
    error?: string
}
