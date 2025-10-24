/**
 * Ren Flow Runner 独立测试
 *
 * 这个文件演示如何在 Node.js 环境中独立使用 renflow.runner
 *
 * 运行方式：
 * yarn workspace renflow.runner build && node renflow.runner/test/standalone-test.js
 */

import { WorkflowEngine, WorkflowConverter } from '../dist/index.js'

// 模拟一个包含条件分支的工作流数据（来自前端导出）
const vueFlowWorkflow = {
    id: 'test_workflow_002',
    name: '测试条件分支工作流',
    description: '测试新的条件判断和数据透传功能',
    triggerType: 'manual',
    triggerTypeLabel: '手动触发',
    triggerName: 'manual_trigger',
    triggerLabel: '手动触发',
    nodes: [
        {
            id: 'node-trigger',
            type: 'trigger',
            position: { x: 0, y: 0 },
            data: {
                triggerType: '手动触发',
                triggerName: '手动触发'
            }
        },
        {
            id: 'node-1',
            type: 'base',
            position: { x: 200, y: 0 },
            data: {
                label: '日志输出',
                nodeType: 'console-log',
                params: {
                    message: '开始执行工作流',
                    logLevel: 'log',
                    includeInput: true
                }
            }
        },
        {
            id: 'node-2',
            type: 'ifelse',
            position: { x: 400, y: 0 },
            data: {
                label: '条件判断',
                nodeType: 'if-else',
                params: {
                    title: '检查输入是否存在',
                    condition: {
                        parameter: 'input',
                        mode: 'exists',
                        value: ''
                    }
                }
            }
        },
        {
            id: 'node-3',
            type: 'base',
            position: { x: 600, y: -50 },
            data: {
                label: '成功分支',
                nodeType: 'console-log',
                params: {
                    message: '条件为 true，输入数据存在',
                    logLevel: 'log'
                }
            }
        },
        {
            id: 'node-4',
            type: 'base',
            position: { x: 600, y: 50 },
            data: {
                label: '失败分支',
                nodeType: 'console-log',
                params: {
                    message: '条件为 false，输入数据不存在',
                    logLevel: 'warn'
                }
            }
        }
    ],
    edges: [
        {
            id: 'edge-trigger-1',
            source: 'node-trigger',
            target: 'node-1'
        },
        {
            id: 'edge-1-2',
            source: 'node-1',
            target: 'node-2'
        },
        {
            id: 'edge-2-3',
            source: 'node-2',
            sourceHandle: 'source-true',
            target: 'node-3'
        },
        {
            id: 'edge-2-4',
            source: 'node-2',
            sourceHandle: 'source-false',
            target: 'node-4'
        }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
}

async function main() {
    console.log('='.repeat(60))
    console.log('Ren Flow Runner 独立测试 - 条件分支和数据透传')
    console.log('='.repeat(60))
    console.log()

    // 1. 创建转换器和引擎
    const converter = new WorkflowConverter()
    const engine = new WorkflowEngine()

    // 2. 转换工作流数据
    console.log('📦 正在转换工作流数据...')
    const executionData = converter.convert(vueFlowWorkflow)
    console.log('✅ 转换完成')
    console.log('入口节点:', executionData.entryNode)
    console.log('节点数量:', Object.keys(executionData.nodes).length)
    console.log()

    // 3. 验证工作流
    console.log('🔍 正在验证工作流...')
    const validation = converter.validate(executionData)
    if (validation.valid) {
        console.log('✅ 验证通过')
    } else {
        console.error('❌ 验证失败:')
        validation.errors.forEach(err => console.error('  -', err))
        return
    }
    console.log()

    // 4. 执行工作流（测试有输入数据的情况）
    console.log('🚀 测试 1: 执行工作流（有输入数据）')
    console.log()

    const result1 = await engine.execute(executionData, { test: '测试数据' }, {
        minDelay: 300,
        timeout: 10000,
        callback: {
            onNodeStart: (nodeId, nodeType) => {
                console.log(`  ▶️  开始执行节点: ${nodeId} (${nodeType})`)
            },
            onNodeComplete: (nodeId, nodeResult) => {
                console.log(`  ✅ 节点执行完成: ${nodeId}`)
                if (nodeResult.output) {
                    console.log(`     输出:`, nodeResult.output)
                }
            },
            onNodeError: (nodeId, error) => {
                console.error(`  ❌ 节点执行失败: ${nodeId}`)
                console.error(`     错误:`, error.message)
            },
            onWorkflowComplete: (workflowResult) => {
                console.log()
                if (workflowResult.success) {
                    console.log('🎉 工作流执行成功!')
                } else {
                    console.error('💥 工作流执行失败:', workflowResult.error)
                }
            }
        }
    })

    console.log()
    console.log('='.repeat(60))
    console.log('执行摘要 - 测试 1')
    console.log('='.repeat(60))
    console.log('状态:', result1.success ? '✅ 成功' : '❌ 失败')
    console.log('日志数量:', result1.logs.length)
    console.log()

    // 5. 执行工作流（测试无输入数据的情况）
    console.log('🚀 测试 2: 执行工作流（无输入数据）')
    console.log()

    const result2 = await engine.execute(executionData, null, {
        minDelay: 300,
        timeout: 10000,
        callback: {
            onNodeStart: (nodeId, nodeType) => {
                console.log(`  ▶️  开始执行节点: ${nodeId} (${nodeType})`)
            },
            onNodeComplete: (nodeId, nodeResult) => {
                console.log(`  ✅ 节点执行完成: ${nodeId}`)
            },
            onWorkflowComplete: (workflowResult) => {
                console.log()
                if (workflowResult.success) {
                    console.log('🎉 工作流执行成功!')
                } else {
                    console.error('💥 工作流执行失败:', workflowResult.error)
                }
            }
        }
    })

    console.log()
    console.log('='.repeat(60))
    console.log('执行摘要 - 测试 2')
    console.log('='.repeat(60))
    console.log('状态:', result2.success ? '✅ 成功' : '❌ 失败')
    console.log('日志数量:', result2.logs.length)
    console.log()
    console.log('测试完成!')
}

main().catch(error => {
    console.error('❌ 测试失败:', error)
    process.exit(1)
})
