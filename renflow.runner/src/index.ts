/**
 * Ren Flow Runner
 * 独立的工作流执行引擎，支持 OneBot 协议连接
 */

import 'reflect-metadata'

import { Logger, LogLevel } from './utils/logger.js'
import { nodeManager } from './nodes/index.js'
import path from 'path'
import fs from 'fs/promises'
import { WorkflowConverter, WorkflowEngine } from './workflow/index.js'

// 检测是否在 Node.js 环境中运行
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node

async function main() {
    const logger = new Logger('Main')
    logger.info('Ren Flow Runner 启动中...')

    if (isNode) {
        logger.info(`Node.js 版本: ${process.version}`)
        logger.info(`平台: ${process.platform} ${process.arch}`)
    }

    // TODO: 初始化 OneBot 连接
    // TODO: 加载工作流配置
    // 如果命令行传入了一个 JSON 文件，则直接加载并运行该工作流
    if (isNode) {
        const arg = process.argv[2]
        if (arg) {
            try {
                const resolved = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg)
                const stat = await fs.stat(resolved)
                if (stat.isFile() && resolved.endsWith('.json')) {
                    logger.info(`检测到工作流 JSON 文件，正在加载: ${resolved}`)
                    const content = await fs.readFile(resolved, { encoding: 'utf-8' })
                    const json = JSON.parse(content)

                    // 判断是否为 VueFlowWorkflow（有 nodes 数组和 edges）或已是执行数据
                    let workflowExecution: any = null
                    if (Array.isArray(json.nodes) && Array.isArray(json.edges)) {
                        const converter = new WorkflowConverter()
                        workflowExecution = converter.convert(json)
                    } else if (json && typeof json.nodes === 'object' && json.entryNode !== undefined) {
                        // 认为已经是 WorkflowExecution
                        workflowExecution = json
                    } else {
                        throw new Error('无法识别的工作流 JSON 格式')
                    }

                    // 简单验证并运行工作流
                    const engine = new WorkflowEngine()

                    const result = await engine.execute(workflowExecution, null)

                    if (!result.success) {
                        logger.error('工作流执行失败 > ', result.error)
                        process.exit(2)
                    }

                    logger.info('工作流执行成功')
                    // 运行完后直接退出（CLI 模式）
                    process.exit(0)
                }
            } catch (e) {
                logger.error('加载或执行工作流时出错:', e)
                process.exit(1)
            }
        }
    }

    logger.info('Ren Flow Runner 已启动')
}

// 仅在 Node.js 环境且直接运行时启动应用
if (isNode && import.meta.url === `file://${process.argv[1]}`) {
    const logger = new Logger('Main')

    main().catch((error) => {
        logger.error('启动失败:', error)
        process.exit(1)
    })

    // 优雅退出处理
    process.on('SIGINT', () => {
        logger.info('接收到退出信号，正在关闭...')
        process.exit(0)
    })

    process.on('SIGTERM', () => {
        logger.info('接收到终止信号，正在关闭...')
        process.exit(0)
    })
}

// 导出模块供其他项目使用
export { Logger, LogLevel } from './utils/logger.js'
export * from './nodes/index.js'
export * from './workflow/index.js'
export * from './connectors/adapter/msgTypes.js'
export { connectorManager } from './connectors/index.js'

/**
 * 全局初始化入口。
 *
 * 在宿主应用启动时调用，用于设置全局日志级别和其他将来需要的全局初始化逻辑。
 * 返回节点管理器单例以便应用直接使用。
 */
export function init(logLevel?: LogLevel, externalLogger?: {
    debug: (moduleName: string, ...args: any[]) => void
    info: (moduleName: string, ...args: any[]) => void
    warn: (moduleName: string, ...args: any[]) => void
    error: (moduleName: string, ...args: any[]) => void
}) {
    if (externalLogger !== undefined) {
        try {
            Logger.setExternalLogger(externalLogger)
        } catch (e) {
            // ignore
        }
    }

    if (logLevel !== undefined) {
        // 设置 Logger 的全局日志级别
        Logger.setLogLevel(logLevel)
        // 同步设置 nodeManager 的日志级别
        try {
            nodeManager.setLogLevel(logLevel)
        } catch (e) {
            // ignore
        }
    }

    return nodeManager
}
