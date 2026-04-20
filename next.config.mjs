

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['openai'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
