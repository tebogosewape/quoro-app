import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteLogger from './src/plugins/viteLogger';

export default defineConfig({
    base: '/',
    plugins: [react(), viteLogger()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@api': path.resolve(__dirname, './src/api'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@styles': path.resolve(__dirname, './src/styles'),
            '@utils': path.resolve(__dirname, './src/utils'),
        },
    },
    server: {
        port: 2100,
        host: true,
        // allow access from this dev host
        allowedHosts: ['dev-qa.quorafinance.co.za'],
        watch: {
            usePolling: true,
            interval: 300,
        },
        hmr: {
            host: 'localhost',
            port: 2100,
            protocol: 'ws',
        },
        proxy: {
            '/api': 'https://dev-api.quorafinance.co.za',
        },
    },
});
