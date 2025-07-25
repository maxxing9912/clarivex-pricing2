// next.config.ts
import type { NextConfig } from "next";
import type { Configuration as WebpackConfiguration } from "webpack";

const nextConfig: NextConfig = {
  env: {
    DISCORD_CLIENT_ID: "1370487453562962101",
    DISCORD_CLIENT_SECRET: "r-4-RqKenXJET83zteNpBkbVFqan9BCy",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      "pk_live_51RTquJGjdxMu1OKbBZaOIuS8IEV9EDYyAcaT2yCmdGXtzXpx4Vlhb0Vmye9E2EqoIa9j5zP5GWY0ahJXhKc5VAa400ZWwV02YU",
  },
  images: {
    domains: ["cdn.discordapp.com"],
  },
  webpack(
    config: WebpackConfiguration,
    { isServer }: { isServer: boolean }
  ): WebpackConfiguration {
    // Add node-loader
    config.module!.rules!.push({
      test: /\.node$/,
      use: { loader: "node-loader" },
    });

    if (isServer) {
      // Externalize discord.js and friends
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : [config.externals!]),
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
