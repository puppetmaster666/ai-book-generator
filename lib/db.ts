import { PrismaClient, Prisma } from '@prisma/client';

export { Prisma };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Retry wrapper for transient database errors (P1017, P2024, etc.)
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
      const prismaError = error as { code?: string };

      // Retry on connection errors
      if (prismaError.code === 'P1017' || prismaError.code === 'P2024') {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError;
}

export default prisma;
