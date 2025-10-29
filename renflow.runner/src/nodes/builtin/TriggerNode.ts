import type { NodeMetadata, NodeParam } from '../types'

/**
 * Trigger node metadata utilities
 * 提供用于 UI 的参数构建函数，使前端可直接从 runner 获取统一的参数定义
 */

export function buildTriggerParams(triggerName: string): NodeParam[] {
    let filterParamOptions: Array<{ label: string; value: string }> = []
    if (triggerName === 'message') {
        filterParamOptions = [
            { label: '消息（message）', value: 'message' },
            { label: '消息类型（message.[*].type）', value: 'message.[*].type' },
            { label: '来源（targetId）', value: 'targetId' }
        ]
    }

    const params: NodeParam[] = [
        { key: 'filterParam', label: '过滤参数', type: 'select', options: filterParamOptions },
        { key: 'filterMode', label: '过滤模式', type: 'select', options: [ { label: '正则表达式', value: 'regex' }, { label: 'shell 命令解析', value: 'shell' } ], /* visible when param is message handled by UI */ },
        { key: 'regexExpression', label: '正则表达式', type: 'input', placeholder: '请输入正则表达式', /* visibleWhen handled in UI */ },
        { key: 'prefix', label: '前缀', type: 'input', placeholder: '命令前缀（例如： /）', /* visibleWhen handled in UI */ },
        { key: 'shellCommand', label: '命令', type: 'input', placeholder: '命令（例如: mcinfo config）', /* tip handled in UI */ },
        { key: 'messageType', label: '消息类型', type: 'select', options: [] },
        { key: 'targetId', label: '来源 ID', type: 'input', placeholder: '请输入来源 ID' }
    ]

    return params
}

export const TriggerNodeMetadata: NodeMetadata = {
    id: 'trigger',
    name: '触发器',
    description: '触发节点（外部事件入口）',
    category: 'input',
    params: buildTriggerParams(''),
    icon: 'bolt'
}

export default TriggerNodeMetadata
