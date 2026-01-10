/**
 * SubPilot - Logger Utility
 * 生产环境日志管理
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4,
}

interface LoggerConfig {
    level: LogLevel;
    prefix?: string;
}

class Logger {
    private level: LogLevel;
    private prefix: string;

    constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
        this.level = config.level;
        this.prefix = config.prefix || '';
    }

    setLevel(level: LogLevel) {
        this.level = level;
    }

    private formatMessage(message: string): string {
        const timestamp = new Date().toISOString().slice(11, 23);
        return this.prefix ? `[${timestamp}] [${this.prefix}] ${message}` : `[${timestamp}] ${message}`;
    }

    debug(message: string, ...args: unknown[]) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    info(message: string, ...args: unknown[]) {
        if (this.level <= LogLevel.INFO) {
            console.log(this.formatMessage(message), ...args);
        }
    }

    warn(message: string, ...args: unknown[]) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatMessage(message), ...args);
        }
    }

    error(message: string, ...args: unknown[]) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.formatMessage(message), ...args);
        }
    }

    /** 创建子 Logger，继承日志级别 */
    child(prefix: string): Logger {
        return new Logger({ level: this.level, prefix });
    }
}

// 根据环境设置默认日志级别
const defaultLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;

/** 全局 Logger 实例 */
export const logger = new Logger({ level: defaultLevel });

/** 创建带前缀的 Logger */
export function createLogger(prefix: string): Logger {
    return logger.child(prefix);
}

export default logger;
