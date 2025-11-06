type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

const formatMessage = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (isDev) {
        const parts = [`[${level.toUpperCase()}]`, message];
        if (context) {
            parts.push(JSON.stringify(context));
        }
        return parts.join(' ');
    }

    const payload = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
    };

    return JSON.stringify(payload);
};

const write = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    const formatted = formatMessage(level, message, context);

    switch (level) {
        case 'debug':
            console.debug(formatted);
            break;
        case 'info':
            console.info(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'error':
            console.error(formatted);
            break;
    }
};

export const logger = {
    debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
    info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
    warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
    error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
