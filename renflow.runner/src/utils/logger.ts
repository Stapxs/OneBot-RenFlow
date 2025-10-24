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

    constructor(moduleName: string) {
        this.moduleName = moduleName
    }

    static setLogLevel(level: LogLevel) {
        Logger.logLevel = level
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
            console.debug(this.formatMessage('DEBUG', ...args))
        }
    }

    info(...args: any[]) {
        if (Logger.logLevel <= LogLevel.INFO) {
            console.info(this.formatMessage('INFO', ...args))
        }
    }

    warn(...args: any[]) {
        if (Logger.logLevel <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', ...args))
        }
    }

    error(...args: any[]) {
        if (Logger.logLevel <= LogLevel.ERROR) {
            console.error(this.formatMessage('ERROR', ...args))
        }
    }
}
