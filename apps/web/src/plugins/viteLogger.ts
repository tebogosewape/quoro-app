import fs from 'fs';
import path from 'path';

export default function viteLogger() {
    const logFilePath = path.resolve('logs/vite.log');

    return {
        name: 'vite-custom-logger',
        buildStart() {
            const message = `[${new Date().toISOString()}] Vite build started\n`;
            console.log(message.trim());
            fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
            fs.appendFileSync(logFilePath, message);
        },
        buildEnd() {
            const message = `[${new Date().toISOString()}] Vite build finished\n`;
            console.log(message.trim());
            fs.appendFileSync(logFilePath, message);
        },
    };
}
