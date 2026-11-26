import { PrismaClient } from '@prisma/client';
import { ensurePersistentData } from '@/lib/auto-seed';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  autoSeeded?: boolean;
  walConfigured?: boolean;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (!isBuildPhase) {
  if (!globalForPrisma.walConfigured) {
    globalForPrisma.walConfigured = true;
    prisma
      .$executeRawUnsafe('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;')
      .catch(() => {});
  }
  // Auto-seed persistent configurations and core data on server initialization
  if (!globalForPrisma.autoSeeded) {
    globalForPrisma.autoSeeded = true;
    ensurePersistentData().catch(() => {});
  }
}
