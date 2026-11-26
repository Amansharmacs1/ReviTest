/**
 * REVITEST — Master Verification Suite (All Functionality)
 *
 * Sequentially executes and verifies all test suites across the entire REVITEST platform:
 *  1. Simplified Quiz Subsystem (Quick creation, public runner, instant evaluation, 1-1-3 ranking, Google Sheets)
 *  2. Phase 5: Exam Scheduling & Multi-Tenant Student Access Matrix
 *  3. Phase 6: Examination Engine, Autosave, Question Sanitization & Concurrency
 *  4. Phase 7: Proctoring & Exam Security, Incident Telemetry & Termination
 *  5. Phase 8: Evaluation, Scoring Matrix, Percentiles & Cohort Ranking
 *  6. Phase 9: SaaS Quotas, API Keys, Webhook HMAC Signatures & Data Streaming
 *  7. Phase 10: Security Hardening, Helmet Policy, Rate Limits & Database Index Audit
 */

import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  {
    name: 'Simplified Quiz Experience (Core Faculty Workflow)',
    file: 'test_simplified_quiz.js',
    description: 'Quick quiz creation, unguessable public link, zero-barrier runner, competition ranking, and Google Sheets sync',
  },
  {
    name: 'Phase 5: Exam Scheduling & Access Matrix',
    file: 'test_phase5.js',
    description: 'Multi-tenant isolation, window timing, batch filtering, and eligibility enforcement',
  },
  {
    name: 'Phase 6: Examination Engine & Attempt Lifecycle',
    file: 'test_phase6.js',
    description: 'Candidate attempt lifecycle, sanitized question delivery, autosave, timer validation, and submission locking',
  },
  {
    name: 'Phase 7: Proctoring & Examination Security',
    file: 'test_phase7.js',
    description: 'Real-time telemetry, violation event capture, severities, auto-termination, and audit logging',
  },
  {
    name: 'Phase 8: Evaluation, Results & Analytics Engine',
    file: 'test_phase8.js',
    description: 'Immutable scoring, section breakdown, percentiles, dense ranking, scorecards, and cohort statistics',
  },
  {
    name: 'Phase 9: SaaS Quotas, Integrations & API Keys',
    file: 'test_phase9.js',
    description: 'Multi-tenant quota enforcement, cryptographic API keys, HMAC-SHA256 webhooks, and CSV streaming',
  },
  {
    name: 'Phase 10: Performance, Security Hardening & Indexes',
    file: 'test_phase10.js',
    description: 'Helmet headers, NoSQL sanitization, rate limiting tiers, 15 model compound indexes, and health telemetry',
  },
];

function runSuite(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`\n================================================================================`);
    console.log(`▶ RUNNING SUITE: ${suite.name}`);
    console.log(`  File: server/${suite.file}`);
    console.log(`  Description: ${suite.description}`);
    console.log(`================================================================================\n`);

    const child = fork(path.join(__dirname, suite.file), [], {
      silent: true,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const str = data.toString();
      stdout += str;
      process.stdout.write(str);
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      stderr += str;
      process.stderr.write(str);
    });

    child.on('close', (code) => {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const combinedOutput = stdout + stderr;

      // Extract passed and failed counts from standard test footer
      const summaryMatch =
        combinedOutput.match(/(?:Results:|\:)\s*(\d+)\s+Passed,\s*(\d+)\s+Failed/i) ||
        combinedOutput.match(/(\d+)\s+passed,\s*(\d+)\s+failed/i);

      let passed = 0;
      let failed = 0;

      if (summaryMatch) {
        passed = parseInt(summaryMatch[1], 10);
        failed = parseInt(summaryMatch[2], 10);
      } else {
        passed = (combinedOutput.match(/✅\s+PASS/g) || []).length;
        failed = (combinedOutput.match(/❌\s+FAIL/g) || []).length;
      }

      resolve({
        suite: suite.name,
        file: suite.file,
        exitCode: code,
        passed,
        failed,
        duration: `${elapsedSec}s`,
        success: code === 0 && failed === 0,
      });
    });
  });
}

async function runAllFunctionalityTests() {
  const masterStart = Date.now();
  console.log(`\n================================================================================`);
  console.log(`🌟 REVITEST — COMPREHENSIVE ALL-FUNCTIONALITY TEST RUNNER`);
  console.log(`   Running 7 Test Suites across all 10 Architectural Phases + Simplified Quiz Platform`);
  console.log(`================================================================================\n`);

  const results = [];

  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
  }

  const totalDuration = ((Date.now() - masterStart) / 1000).toFixed(1);
  const totalPassed = results.reduce((acc, r) => acc + (r.passed || 0), 0);
  const totalFailed = results.reduce((acc, r) => acc + (r.failed || 0), 0);
  const allSucceeded = results.every((r) => r.success);

  console.log(`\n\n================================================================================`);
  console.log(`🏁 MASTER FUNCTIONALITY TEST SUMMARY`);
  console.log(`================================================================================`);
  console.log(`Total Wall-Clock Time: ${totalDuration}s`);
  console.log(`Total Test Suites:     ${results.length}`);
  console.log(`Total Assertions:      ${totalPassed + totalFailed} (${totalPassed} Passed, ${totalFailed} Failed)\n`);

  console.table(
    results.map((r) => ({
      'Suite Name': r.suite,
      File: r.file,
      Status: r.success ? '✅ PASSED' : '❌ FAILED',
      Passed: r.passed,
      Failed: r.failed,
      Duration: r.duration,
    }))
  );

  console.log(`================================================================================\n`);

  if (!allSucceeded) {
    console.error('❌ One or more test suites failed. See logs above for details.\n');
    process.exit(1);
  } else {
    console.log('🎉 ALL REVITEST FUNCTIONALITY VERIFIED SUCCESSFULLY! 100% OPERATIONAL.\n');
    process.exit(0);
  }
}

runAllFunctionalityTests();
