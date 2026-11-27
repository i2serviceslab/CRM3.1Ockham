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
      .$executeRawUnsafe(
        [
          'PRAGMA journal_mode = WAL;',
          'PRAGMA synchronous = NORMAL;',
          'PRAGMA busy_timeout = 5000;',
          'CREATE INDEX IF NOT EXISTS "Contact_tenantId_idx" ON "Contact"("tenantId");',
          'CREATE INDEX IF NOT EXISTS "Contact_updatedAt_idx" ON "Contact"("updatedAt");',
          'CREATE INDEX IF NOT EXISTS "Contact_stage_idx" ON "Contact"("stage");',
          'CREATE INDEX IF NOT EXISTS "Contact_investorType_idx" ON "Contact"("investorType");',
          'CREATE INDEX IF NOT EXISTS "Interaction_contactId_createdAt_idx" ON "Interaction"("contactId", "createdAt");',
          'CREATE INDEX IF NOT EXISTS "Document_contactId_createdAt_idx" ON "Document"("contactId", "createdAt");',
          'CREATE INDEX IF NOT EXISTS "TimelineActivity_contactId_createdAt_idx" ON "TimelineActivity"("contactId", "createdAt");',
          'UPDATE "SocialCategory" SET "createdAt" = "createdAt" || \'Z\' WHERE typeof("createdAt") = \'text\' AND "createdAt" NOT LIKE \'%Z\';',
          'UPDATE "SocialCategory" SET "updatedAt" = "updatedAt" || \'Z\' WHERE typeof("updatedAt") = \'text\' AND "updatedAt" NOT LIKE \'%Z\';',
          'UPDATE "MediaFolder" SET "createdAt" = "createdAt" || \'Z\' WHERE typeof("createdAt") = \'text\' AND "createdAt" NOT LIKE \'%Z\';',
        ].join(' ')
      )
      .catch(() => {});
  }
  // Auto-seed persistent configurations and core data on server initialization
  if (!globalForPrisma.autoSeeded) {
    globalForPrisma.autoSeeded = true;
    ensurePersistentData().catch(() => {});
  }
}
