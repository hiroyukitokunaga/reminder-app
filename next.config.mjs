import withPWA from '@ducanh2912/next-pwa'

const isDev = process.env.NODE_ENV === 'development'

const baseConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
}

const pwaConfig = withPWA({
  ...baseConfig,
  pwa: {
    dest: "public",
    swSrc: "public/notification-worker.js",
    disable: isDev,
    register: false,
    skipWaiting: true,
    scope: '/',
    buildExcludes: [/.map$/, /_next\/static\/.*$/, /_next\/server\/.*$/],
  },
})

const finalConfig = {
  ...pwaConfig,
  output: 'export', // ← ← ← ここを最終的に上書き
}

export default finalConfig