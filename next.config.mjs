const isProd = process.env.NODE_ENV === 'production';
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
export default {
    // Force static-site generation
    output: 'export', // Critical! Tauri can’t host SSR
    images: {
        unoptimized: true
    }, // Needed because 'export' disables the Image API
    assetPrefix: isProd ? undefined : `http://${internalHost}:3000`
};