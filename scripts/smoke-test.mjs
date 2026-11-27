#!/usr/bin/env node
/**
 * Pre-deploy / post-deploy smoke test for Copper Giant CRM.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/smoke-test.mjs
 */
const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

async function check(name, path, expectedStatuses, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { redirect: 'manual', ...options });
  const ok = expectedStatuses.includes(res.status);
  const label = ok ? 'PASS' : 'FAIL';
  console.log(`[${label}] ${name} -> HTTP ${res.status} (${path})`);
  if (!ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${name} failed: expected ${expectedStatuses.join('/')}, got ${res.status} ${body.slice(0, 200)}`);
  }
}

(async () => {
  await check('Health endpoint', '/api/health', [200]);
  await check('Auth me (unauthenticated)', '/api/auth/me', [200]);
  await check('Email login disabled', '/api/auth/magic', [410], { method: 'POST', body: '{}' });
  await check('Protected contacts API blocks unauth', '/api/contacts', [401]);
  await check('Protected users API blocks unauth', '/api/users', [401]);
  await check('Protected backups API blocks unauth', '/api/admin/backups', [401]);
  console.log('All CRM smoke tests passed.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
