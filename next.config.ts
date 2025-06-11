import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DISCORD_CLIENT_ID: "1370487453562962101",
    DISCORD_CLIENT_SECRET: "r-4-RqKenXJET83zteNpBkbVFqan9BCy",
    NEXTAUTH_URL: "http://localhost:3000/",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      "pk_test_51RTquJGjdxMu1OKbOXLmErQAVDy7416CN8lraiP2YsPNH4ufZUFgNiuuQkNRNtnqyyc8hXG02rYYnNVJEm5uH1Re00pOIg6RO2",
  },
  webpack(
    config: any,
    { isServer }: { isServer: boolean }
  ): any {
    // Add node-loader
    config.module.rules.push({
      test: /\.node$/,
      use: { loader: "node-loader" },
    });

    if (isServer) {
      // Externalize discord.js and friends
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : [config.externals]),
        {
          "discord.js": "commonjs2 discord.js",
          "@discordjs/ws": "commonjs2 @discordjs/ws",
          "zlib-sync": "commonjs2 zlib-sync",
        },
      ];
    }

    return config;
  },
};

export default nextConfig;