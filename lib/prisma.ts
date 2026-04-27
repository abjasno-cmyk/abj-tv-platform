import { PrismaClient } from "@prisma/client";

declare global {
  var __abjPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__abjPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__abjPrisma = prisma;
}
