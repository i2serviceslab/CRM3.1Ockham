# PostgreSQL Migration Guide (Copper Giant CRM)

1. Provision a PostgreSQL instance (EasyPanel Postgres, Neon, or Supabase) and set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/coppergiant_crm?sslmode=require"
   ```
2. In `prisma/schema.prisma`, switch the `datasource db` provider from `"sqlite"` to `"postgresql"`.
3. Push the schema and generate client:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Export/import existing SQLite contacts & records from JSON backup (`/api/admin/backups`) or using `pgloader`.
