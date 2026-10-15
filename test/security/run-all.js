/**
 * Master Security Test Suite Runner
 * Executes all security test tiers (Tiers 1-4) and produces structured reporting.
 *
 * Usage:
 *   node test/security/run-all.js
 *   node test/security/run-all.js --tier=1
 *   node test/security/run-all.js --filter=r1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import './harness/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI args
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith('--tier=') || a.startsWith('-t='))?.split('=')[1];
const filterArg = args.find((a) => a.startsWith('--filter=') || a.startsWith('-f='))?.split('=')[1]?.toLowerCase();

console.log('\n' + '='.repeat(80));
console.log('🛡️  PILATES STUDIO MANAGER - COMPREHENSIVE SECURITY & LGPD TEST RUNNER');
console.log('='.repeat(80));

// Find all test files
function findTestFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.cache' && item.name !== 'harness') {
        results = results.concat(findTestFiles(fullPath));
      }
    } else if (item.name.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allTestFiles = findTestFiles(__dirname);

// Filter by tier or filter pattern
const selectedFiles = allTestFiles.filter((file) => {
  const rel = path.relative(__dirname, file).replace(/\\/g, '/');
  if (tierArg) {
    if (tierArg === '1' && !rel.startsWith('tier1-')) return false;
    if (tierArg === '2' && !rel.startsWith('tier2-')) return false;
    if (tierArg === '3' && !rel.startsWith('tier3-')) return false;
    if (tierArg === '4' && !rel.startsWith('tier4-')) return false;
  }
  if (filterArg && !rel.toLowerCase().includes(filterArg)) {
    return false;
  }
  return true;
});

console.log(`Discovered ${allTestFiles.length} test suites. Selected: ${selectedFiles.length}`);
console.log('-'.repeat(80));

// Run test files sequentially using node --test
async function runTestFile(file) {
  const relPath = path.relative(path.resolve(__dirname, '../..'), file).replace(/\\/g, '/');
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--test', file], {
      cwd: path.resolve(__dirname, '../..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('close', (code) => {
      // Parse TAP or subtest output
      const passMatches = stdout.match(/ok \d+ - ([^\n]+)/g) || [];
      const failMatches = stdout.match(/not ok \d+ - ([^\n]+)/g) || [];
      const passCount = passMatches.length;
      const failCount = failMatches.length;

      resolve({
        file: relPath,
        code,
        passCount,
        failCount,
        stdout,
        stderr,
        failures: failMatches.map((m) => m.replace(/^not ok \d+ - /, '')),
      });
    });
  });
}

async function runAll() {
  const startTime = Date.now();
  let totalPass = 0;
  let totalFail = 0;
  const suiteResults = [];

  for (const file of selectedFiles) {
    const relName = path.relative(__dirname, file).replace(/\\/g, '/');
    process.stdout.write(`⏳ Running: ${relName} ... `);
    const res = await runTestFile(file);
    suiteResults.push(res);
    totalPass += res.passCount;
    totalFail += res.failCount;

    if (res.code === 0 && res.failCount === 0) {
      console.log(`✅ PASS (${res.passCount} passed)`);
    } else {
      console.log(`❌ FAIL (${res.failCount} failed, ${res.passCount} passed)`);
      if (res.failures.length > 0) {
        for (const f of res.failures) {
          console.log(`   - Failed: ${f}`);
        }
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(80));
  console.log('📊 SECURITY TEST EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Test Suites: ${selectedFiles.length}`);
  console.log(`Total Test Assertions Passed: ${totalPass}`);
  console.log(`Total Test Assertions Failed: ${totalFail}`);
  console.log(`Execution Duration: ${duration}s`);

  // Breakdown by Tier
  const tierSummary = {
    'Tier 1: Feature Coverage (R1, R2, R3, R4)': { pass: 0, fail: 0 },
    'Tier 2: Boundary & Corner Cases': { pass: 0, fail: 0 },
    'Tier 3: Cross-Feature Combinations': { pass: 0, fail: 0 },
    'Tier 4: Real-World Audit Scenario': { pass: 0, fail: 0 },
  };

  for (const s of suiteResults) {
    if (s.file.includes('tier1-')) {
      tierSummary['Tier 1: Feature Coverage (R1, R2, R3, R4)'].pass += s.passCount;
      tierSummary['Tier 1: Feature Coverage (R1, R2, R3, R4)'].fail += s.failCount;
    } else if (s.file.includes('tier2-')) {
      tierSummary['Tier 2: Boundary & Corner Cases'].pass += s.passCount;
      tierSummary['Tier 2: Boundary & Corner Cases'].fail += s.failCount;
    } else if (s.file.includes('tier3-')) {
      tierSummary['Tier 3: Cross-Feature Combinations'].pass += s.passCount;
      tierSummary['Tier 3: Cross-Feature Combinations'].fail += s.failCount;
    } else if (s.file.includes('tier4-')) {
      tierSummary['Tier 4: Real-World Audit Scenario'].pass += s.passCount;
      tierSummary['Tier 4: Real-World Audit Scenario'].fail += s.failCount;
    }
  }

  console.log('\nTier Breakdown:');
  for (const [tierName, stats] of Object.entries(tierSummary)) {
    const total = stats.pass + stats.fail;
    const statusIcon = stats.fail === 0 && total > 0 ? '🟢' : '🔴';
    console.log(`  ${statusIcon} ${tierName}: ${stats.pass}/${total} passed (${stats.fail} failed)`);
  }

  console.log('='.repeat(80));

  if (totalFail > 0) {
    console.log(`\n⚠️  Baseline security flaws detected (${totalFail} tests failed).`);
    console.log('These test failures represent unfulfilled security requirements awaiting implementation milestones (M1-M4).');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SECURITY TESTS PASSED! Project is fully shielded.');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal error running test runner:', err);
  process.exit(1);
});
