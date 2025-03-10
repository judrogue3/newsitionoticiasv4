/** @type {import('next').NextConfig} */
const nextConfig = {
  // Eliminamos output: 'export' para permitir renderizado del lado del servidor
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    // Resolver el problema con undici y sus campos privados (#)
    config.module.rules.push({
      test: /\.js$/,
      include: [
        /node_modules\/undici/,
        /node_modules\/cheerio\/node_modules\/undici/
      ],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            ['@babel/plugin-transform-class-properties', { loose: true }],
            ['@babel/plugin-transform-private-methods', { loose: true }],
            ['@babel/plugin-transform-private-property-in-object', { loose: true }]
          ]
        }
      }
    });
    
    return config;
  }
};

module.exports = nextConfig;
