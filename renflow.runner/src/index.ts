/**
 * Ren Flow Runner
 * 独立的工作流执行引擎，支持 OneBot 协议连接
 */

import { Logger } from './utils/logger.js'

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
    // TODO: 启动工作流引擎

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
