/**
 * DigiReady Database Provider & Environment Preparation Script
 *
 * Automatically switches Prisma schema datasource provider between:
 * - "sqlite" (Local development, offline testing, fallback)
 * - "postgresql" (Vercel production deployments with hosted PostgreSQL e.g. Vercel Postgres / Neon / Supabase)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

function prepareDatabase() {
  if (!fs.existsSync(schemaPath)) {
    console.warn('[prepare-db] prisma/schema.prisma not found at:', schemaPath);
    return;
  }

  const rawDbUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    '';

  const isPostgres =
    rawDbUrl.startsWith('postgresql://') ||
    rawDbUrl.startsWith('postgres://') ||
    process.env.PRISMA_PROVIDER === 'postgresql';

  const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  let updated = false;

  if (isPostgres) {
    if (schemaContent.includes('provider = "sqlite"')) {
      schemaContent = schemaContent.replace('provider = "sqlite"', 'provider = "postgresql"');
      updated = true;
    }
  } else {
    if (schemaContent.includes('provider = "postgresql"')) {
      schemaContent = schemaContent.replace('provider = "postgresql"', 'provider = "sqlite"');
      updated = true;
    }
  }

  const clientIndex = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'index.js');
  const clientMissing = !fs.existsSync(clientIndex);

  if (updated) {
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log(`[prepare-db] Adjusted prisma/schema.prisma datasource provider to: ${targetProvider}`);
    try {
      console.log('[prepare-db] Regenerating Prisma Client for provider:', targetProvider);
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (err) {
      console.warn('[prepare-db] Prisma generate warning (continuing build):', err.message);
    }
  } else if (clientMissing) {
    console.log('[prepare-db] Prisma client missing. Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
    } catch (err) {
      console.warn('[prepare-db] Prisma generate warning (continuing build):', err.message);
    }
  } else {
    console.log(`[prepare-db] prisma/schema.prisma provider is currently: ${targetProvider}`);
  }

  // Automatic schema synchronization & seeding for hosted PostgreSQL in Vercel / CI deployments
  if (isPostgres && (process.env.VERCEL || process.env.AUTO_MIGRATE === 'true')) {
    const activeUrl = rawDbUrl;
    console.log('[prepare-db] Production Vercel/PostgreSQL deployment detected.');
    try {
      console.log('[prepare-db] Synchronizing PostgreSQL schema with prisma db push...');
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: activeUrl,
        },
      });

      console.log('[prepare-db] Seeding initial canonical services and demo records...');
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: activeUrl,
        },
      });
      console.log('[prepare-db] Database initialization completed successfully.');
    } catch (err) {
      console.warn('[prepare-db] Automatic DB push/seed warning (non-fatal):', err.message || err);
    }
  }
}

prepareDatabase();
