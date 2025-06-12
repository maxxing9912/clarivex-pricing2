// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // Evita istanze multiple in sviluppo con hot-reload
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"], // opzionale, utile in dev
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
