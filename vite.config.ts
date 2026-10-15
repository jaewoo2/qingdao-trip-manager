import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [VitePWA({
    strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', injectRegister: false,
    registerType: 'prompt',
    injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,webp,webmanifest}'] },
    manifest: {
      id: '/', name: '칭다오 여행 매니저 · 예시 앱', short_name: '칭다오 노트', lang: 'ko',
      description: '오프라인에서도 일정·준비물·식당 후보를 관리하는 여행 앱', start_url: '/', scope: '/', display: 'standalone',
      theme_color: '#17665d', background_color: '#f8f7f3',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  })],
  test: { include: ['tests/**/*.test.{ts,tsx}'] },
});
