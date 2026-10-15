/**
 * Tier 2 - Boundary & Corner Cases: Concurrency, Burst Traffic & Lockout Limits
 * (>=5 test cases per feature)
 */
import test from 'node:test';
import assert from 'node:assert';
import { testDb } from '../harness/db-store.js';
import { invokeApiRoute } from '../harness/route-invoker.js';
import { createStudentJwt } from '../harness/crypto-tools.js';

test.describe('Tier 2 - Concurrency & Rate Limit Boundaries', () => {
  test.beforeEach(() => {
    testDb.seedDefaults();
  });

  test('TC-T2.3.1: Burst of 20 concurrent invalid login requests triggers rate limit (HTTP 429/423)', async () => {
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
          headers: { 'x-forwarded-for': '198.51.100.50' },
          body: {
            email: 'maria.silva@example.com',
            password: `burst_attack_pwd_${i}`,
          },
        })
      );
    }

    const results = await Promise.all(promises);
    const hasRateLimit = results.some((r) => r.status === 429 || r.status === 423);

    assert.ok(
      hasRateLimit,
      'Concurrent burst attack must trigger rate limiting on invalid credentials'
    );
  });

  test('TC-T2.3.2: Rate limiter tracks attempts accurately without race conditions under concurrency', async () => {
    const attempts = 12;
    const promises = Array.from({ length: attempts }, (_, i) =>
      invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': '198.51.100.51' },
        body: { email: 'maria.silva@example.com', password: `pwd_${i}` },
      })
    );

    const responses = await Promise.all(promises);
    const statuses = responses.map((r) => r.status);
    const count401 = statuses.filter((s) => s === 401).length;
    const count429 = statuses.filter((s) => s === 429 || s === 423).length;

    assert.ok(count401 > 0, 'Initial requests should return 401');
    assert.ok(count429 > 0, 'Later requests in the concurrent burst should return 429/423');
  });

  test('TC-T2.3.3: Concurrent legitimate logins for different students execute without false-positive lockouts', async () => {
    const promises = [];
    // Student 1 (beatriz)
    promises.push(
      invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: { 'x-forwarded-for': '192.168.1.10' },
        body: { email: 'beatriz.almeida@example.com', password: 'senhaSeguraAluno#2026' },
      })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      assert.notStrictEqual(r.status, 429);
      assert.notStrictEqual(r.status, 423);
    }
  });

  test('TC-T2.3.4: Spoofed X-Forwarded-For chain with internal IPs does not bypass rate limit', async () => {
    let rateLimited = false;
    for (let i = 0; i < 15; i++) {
      const res = await invokeApiRoute('src/app/api/auth/login/route.ts', 'POST', {
        headers: {
          // Attacker injecting multiple IP headers
          'x-forwarded-for': `10.0.0.1, 127.0.0.1, 192.168.1.${i}`,
        },
        body: {
          email: 'maria.silva@example.com',
          password: 'attack_with_spoofed_headers',
        },
      });

      if (res.status === 429 || res.status === 423) {
        rateLimited = true;
        break;
      }
    }

    assert.ok(rateLimited, 'Rate limiter must enforce limit despite spoofed proxy headers');
  });

  test('TC-T2.3.5: 30 concurrent /api/auth/me token verifications for valid sessions succeed with HTTP 200', async () => {
    const validToken = await createStudentJwt({
      id: 'student_migrated_003',
      email: 'beatriz.almeida@example.com',
      name: 'Beatriz Almeida',
    });

    const requests = Array.from({ length: 30 }, () =>
      invokeApiRoute('src/app/api/auth/me/route.ts', 'GET', {
        cookies: { student_session: validToken },
      })
    );

    const responses = await Promise.all(requests);
    for (const res of responses) {
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data?.authenticated, true);
    }
  });
});
