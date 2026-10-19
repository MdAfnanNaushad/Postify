/**
 * Postify Scheduled Digest Job Runner
 * Phase 10.1: Resend Email Delivery Integration
 * 
 * Execution:
 * node server/src/scripts/runDigestJob.js [--force] [--period=YYYY-Www]
 * e.g. crontab: 0 6 * * 1 node /path/to/server/src/scripts/runDigestJob.js >> /var/log/postify-digest.log 2>&1
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { getMongoUri } = require('../config/db');
const { generateAllActiveDigests } = require('../services/digestService');
const { getWeekBounds } = require('../utils/digestUtils');
const { isEmailConfigured, getEmailConfig } = require('../services/emailService');

async function run() {
  const uri = getMongoUri();
  const startTime = Date.now();
  console.log(`[DigestJob] Starting weekly digest run at ${new Date().toISOString()}`);

  // Parse CLI flags
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const periodArg = args.find((a) => a.startsWith('--period='));
  const customPeriod = periodArg ? periodArg.split('=')[1] : null;

  try {
    await mongoose.connect(uri);
    console.log('[DigestJob] Connected to database.');

    const bounds = getWeekBounds(customPeriod || new Date());
    console.log(`[DigestJob] Target Period: ${bounds.periodKey} (${bounds.label})`);

    const emailStatus = getEmailConfig();
    if (emailStatus.configured) {
      console.log(`[DigestJob] Resend email delivery: CONFIGURED (Sender: ${emailStatus.fromEmail})`);
    } else {
      console.log(`[DigestJob] Resend email delivery: UNCONFIGURED (Missing: ${emailStatus.missing.join(', ')}). In-app digests will generate without emails.`);
    }

    if (force) {
      console.log('[DigestJob] Flag --force detected: Regenerating existing period digests.');
    }

    // Execute batch generation
    const stats = await generateAllActiveDigests(bounds.periodKey, { force });

    const elapsedMs = Date.now() - startTime;
    console.log('\n[DigestJob] ========== RUN SUMMARY ==========');
    console.log(`[DigestJob] • Total Eligible Developers : ${stats.total}`);
    console.log(`[DigestJob] • New Digests Generated     : ${stats.generated}`);
    console.log(`[DigestJob] • Already Up-to-Date        : ${stats.alreadyCurrent}`);
    console.log(`[DigestJob] • Resend Requests Accepted  : ${stats.emailsSent}`);
    console.log(`[DigestJob] • Email Requests Failed     : ${stats.emailsFailed}`);
    console.log(`[DigestJob] • Email Delivery Skipped    : ${stats.emailsSkipped}`);
    console.log(`[DigestJob] • Email Provider Disabled   : ${stats.emailDisabled}`);
    console.log(`[DigestJob] • Account Processing Errors : ${stats.errors}`);
    console.log(`[DigestJob] • Duration                  : ${elapsedMs}ms`);
    console.log('[DigestJob] ===================================\n');

    await mongoose.disconnect();
    console.log('[DigestJob] Disconnected cleanly. Batch run finished successfully.');
    if (require.main === module) {
      process.exit(0);
    }
    return stats;
  } catch (err) {
    console.error('[DigestJob] Fatal error during digest run:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
