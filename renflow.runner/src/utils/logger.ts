/**
 * 简单的日志工具类
 */

/* eslint-disable no-console */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private moduleName: string
    private static logLevel: LogLevel = LogLevel.INFO
    /** 可选的外部 logger（宿主应用传入） */
    private static externalLogger: any = null

    constructor(moduleName: string) {
        this.moduleName = moduleName
    }

    static setLogLevel(level: LogLevel) {
        Logger.logLevel = level
    }

    /**
     * 注入宿主应用的 logger 实例（可选），用于替换默认的 console 输出。
     * externalLogger 推荐提供 methods: debug/info/warn/error
     */
    static setExternalLogger(logger: any) {
        Logger.externalLogger = logger
    }

    private formatMessage(level: string, ...args: any[]): string {
        const timestamp = new Date().toISOString()
        const prefix = `[${timestamp}] [${level}] [${this.moduleName}]`
        return `${prefix} ${args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')}`
    }

    debug(...args: any[]) {
        if (Logger.logLevel <= LogLevel.DEBUG) {
            if (Logger.externalLogger && typeof Logger.externalLogger.debug === 'function') {
                try { Logger.externalLogger.debug(this.moduleName, ...args) } catch (e) { /* ignore */ }
            } else {
                console.debug(this.formatMessage('DEBUG', ...args))
            }
        }
    }

    info(...args: any[]) {
        if (Logger.logLevel <= LogLevel.INFO) {
            if (Logger.externalLogger && typeof Logger.externalLogger.info === 'function') {
                try { Logger.externalLogger.info(this.moduleName, ...args) } catch (e) { /* ignore */ }
            } else {
                console.info(this.formatMessage('INFO', ...args))
            }
        }
    }

    warn(...args: any[]) {
        if (Logger.logLevel <= LogLevel.WARN) {
            if (Logger.externalLogger && typeof Logger.externalLogger.warn === 'function') {
                try { Logger.externalLogger.warn(this.moduleName, ...args) } catch (e) { /* ignore */ }
            } else {
                console.warn(this.formatMessage('WARN', ...args))
            }
        }
    }

    error(...args: any[]) {
        if (Logger.logLevel <= LogLevel.ERROR) {
            if (Logger.externalLogger && typeof Logger.externalLogger.error === 'function') {
                try { Logger.externalLogger.error(this.moduleName, ...args) } catch (e) { /* ignore */ }
            } else {
                console.error(this.formatMessage('ERROR', ...args))
            }
        }
    }
}
