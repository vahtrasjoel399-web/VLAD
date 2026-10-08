import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  redirects() {
    return [
      {
        source: '/admin',
        destination: 'https://smolin-fx.sanity.studio/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
