/**
 * Email Service for Postify Weekly Digest
 * Official Resend SDK Integration
 * 
 * Features:
 * - Official Resend SDK (resend) with API key & sender address validation
 * - Strict HTML escaping and safe URL validation (rejects javascript:, data:, etc.)
 * - Bounded retries (max 3 attempts) and duplicate send protection
 * - Ambiguous network timeout detection preventing blind duplicate dispatches
 * - Deterministic deliveryKey header tracking ('X-Entity-Ref-ID', 'Idempotency-Key')
 * - Polished twilight editorial HTML template + clean plain-text companion
 * - Safe mockResend and mockTransport support for isolated automated tests
 */

const { Resend } = require('resend');

/**
 * Checks whether Resend email provider has required configuration
 */
function isEmailConfigured(env = process.env) {
  const apiKey = env.RESEND_API_KEY ? env.RESEND_API_KEY.trim() : '';
  const fromEmail = env.RESEND_FROM_EMAIL ? env.RESEND_FROM_EMAIL.trim() : '';
  return Boolean(apiKey && fromEmail);
}

/**
 * Returns configuration details and any missing required variables
 * Note: Never exposes the raw API key to public responses or logs.
 */
function getEmailConfig(env = process.env) {
  const apiKey = env.RESEND_API_KEY ? env.RESEND_API_KEY.trim() : '';
  const fromEmail = env.RESEND_FROM_EMAIL ? env.RESEND_FROM_EMAIL.trim() : '';
  const fromName = env.RESEND_FROM_NAME ? env.RESEND_FROM_NAME.trim() : 'Postify Digest';

  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!fromEmail) missing.push('RESEND_FROM_EMAIL');

  const canonicalUrl = env.CANONICAL_APP_URL || env.CLIENT_URL || 'http://localhost:5173';

  return {
    configured: missing.length === 0,
    provider: 'resend',
    apiKey,
    fromEmail,
    fromName,
    canonicalUrl,
    missing
  };
}

/**
 * Escapes user-provided content for HTML inclusion to prevent injection
 */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes URLs to permit only safe HTTP and HTTPS protocols.
 * Rejects javascript:, data:, vbscript:, etc.
 */
function sanitizeUrl(rawUrl, fallbackBaseUrl = 'http://localhost:5173') {
  if (!rawUrl || typeof rawUrl !== 'string') return fallbackBaseUrl;
  const trimmed = rawUrl.trim();

  // Reject dangerous pseudo-protocols
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallbackBaseUrl;
  }

  try {
    const parsed = new URL(trimmed, fallbackBaseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallbackBaseUrl;
    }
    return parsed.href;
  } catch {
    return fallbackBaseUrl;
  }
}

/**
 * Detects whether an error represents an ambiguous network timeout
 */
function isTimeoutError(err) {
  if (!err) return false;
  const str = String(err.message || err.name || err.code || '').toLowerCase();
  return (
    str.includes('timeout') ||
    str.includes('timed out') ||
    str.includes('econnreset') ||
    str.includes('etimedout') ||
    str.includes('abort') ||
    str.includes('fetch failed')
  );
}

/**
 * Builds clean, responsive HTML email template for the weekly digest
 * Preserves Postify's twilight editorial visual identity
 */
function buildDigestEmailHtml({ user, digest, dateRangeLabel, clientBaseUrl }) {
  const safeName = escapeHtml(user.name || user.username || 'Developer');
  const safeSummary = escapeHtml(
    digest?.summary || 'Here is your weekly summary of developer updates on Postify.'
  );

  const digestUrl = sanitizeUrl(`${clientBaseUrl}/digest`, clientBaseUrl);
  const unsubscribeUrl = sanitizeUrl(`${clientBaseUrl}/digest?tab=settings`, clientBaseUrl);

  const followedPostsHtml = (digest?.sections?.followedPosts || [])
    .slice(0, 3)
    .map((p) => {
      const author = escapeHtml(p.author?.name || p.author?.username || 'Developer');
      const excerpt = escapeHtml((p.content || '').slice(0, 140));
      const postUrl = sanitizeUrl(`${clientBaseUrl}/post/${p._id}`, clientBaseUrl);
      return `
        <div style="padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; background: #f9f9fa; border-left: 3px solid #007aff;">
          <div style="font-weight: 600; font-size: 13px; color: #111;">${author}</div>
          <div style="font-size: 13px; color: #444; margin-top: 4px; line-height: 1.4;">${excerpt}</div>
          <div style="margin-top: 6px;"><a href="${postUrl}" style="font-size: 12px; color: #007aff; text-decoration: none;">Read update &rarr;</a></div>
        </div>
      `;
    })
    .join('');

  const buildLogsHtml = (digest?.sections?.followedBuildLogs || [])
    .slice(0, 3)
    .map((log) => {
      const title = escapeHtml(log.title);
      const projName = escapeHtml(log.project?.name || 'Project');
      const owner = escapeHtml(log.project?.ownerUsername || 'developer');
      const projSlug = escapeHtml(log.project?.slug || '');
      const logUrl = sanitizeUrl(
        `${clientBaseUrl}/projects/${owner}/${projSlug}/logs/${log._id}`,
        clientBaseUrl
      );
      return `
        <div style="padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; background: #f9f9fa; border-left: 3px solid #10b981;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #10b981;">${escapeHtml(log.entryType || 'LOG')} &bull; ${projName}</div>
          <div style="font-weight: 600; font-size: 13px; color: #111; margin-top: 2px;">${title}</div>
          <div style="margin-top: 6px;"><a href="${logUrl}" style="font-size: 12px; color: #007aff; text-decoration: none;">View build log &rarr;</a></div>
        </div>
      `;
    })
    .join('');

  const interactions = digest?.sections?.postActivity?.interactions || [];
  const interactionsHtml = interactions
    .slice(0, 3)
    .map((i) => {
      const actorName = escapeHtml(i.actor?.name || i.actor?.username || 'Developer');
      const excerpt = escapeHtml((i.postExcerpt || '').slice(0, 100));
      return `
        <div style="padding: 8px 12px; margin-bottom: 6px; font-size: 12px; color: #52525b; background: #fafafa; border-radius: 6px;">
          <strong style="color: #18181b;">${actorName}</strong> responded to your update: <em>"${excerpt}"</em>
        </div>
      `;
    })
    .join('');

  const highlightsHtml = (digest?.sections?.publicHighlights || [])
    .slice(0, 2)
    .map((h) => {
      const title = escapeHtml(h.title || h.description?.slice(0, 60) || 'Project Highlight');
      const author = escapeHtml(h.authorName || 'Developer');
      return `
        <div style="padding: 10px 14px; margin-bottom: 6px; border-radius: 6px; background: #fdfdfd; border: 1px solid #f4f4f5; font-size: 12px;">
          <div style="font-weight: 600; color: #27272a;">${title}</div>
          <div style="color: #71717a; margin-top: 2px;">by ${author}</div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Postify Weekly Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; color: #18181b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="padding: 24px 32px; background: linear-gradient(135deg, #007aff 0%, #6366f1 100%); color: #ffffff;">
      <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">POSTIFY</div>
      <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Weekly Developer Digest &bull; ${escapeHtml(dateRangeLabel)}</div>
    </div>
    
    <div style="padding: 32px;">
      <h2 style="font-size: 18px; margin: 0 0 8px 0; color: #09090b;">Hello ${safeName},</h2>
      <p style="font-size: 14px; color: #52525b; line-height: 1.5; margin: 0 0 24px 0;">${safeSummary}</p>

      ${followedPostsHtml ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin: 0 0 12px 0;">Updates from developers you follow</h3>
          ${followedPostsHtml}
        </div>
      ` : ''}

      ${buildLogsHtml ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin: 0 0 12px 0;">New Project Build Logs</h3>
          ${buildLogsHtml}
        </div>
      ` : ''}

      ${interactionsHtml ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin: 0 0 12px 0;">Activity On Your Updates</h3>
          ${interactionsHtml}
        </div>
      ` : ''}

      ${highlightsHtml ? `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #71717a; margin: 0 0 12px 0;">Community Highlights</h3>
          ${highlightsHtml}
        </div>
      ` : ''}

      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${digestUrl}" style="display: inline-block; padding: 12px 28px; background: #007aff; color: #ffffff; text-decoration: none; border-radius: 9999px; font-weight: 600; font-size: 14px;">Open Full In-App Digest</a>
      </div>
    </div>

    <div style="padding: 16px 32px; background: #fafafa; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #a1a1aa;">
      You received this because you opted in to weekly email digests on Postify.<br>
      <a href="${unsubscribeUrl}" style="color: #71717a; text-decoration: underline;">Manage email preferences or Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Builds plain-text companion version of the weekly digest email
 */
function buildDigestEmailText({ user, digest, dateRangeLabel, clientBaseUrl }) {
  const safeName = user.name || user.username || 'Developer';
  const summary = digest?.summary || 'Here is your weekly summary of developer updates on Postify.';
  const digestUrl = sanitizeUrl(`${clientBaseUrl}/digest`, clientBaseUrl);
  const unsubscribeUrl = sanitizeUrl(`${clientBaseUrl}/digest?tab=settings`, clientBaseUrl);

  const lines = [
    'POSTIFY — WEEKLY DEVELOPER DIGEST',
    `Period: ${dateRangeLabel}`,
    '='.repeat(40),
    '',
    `Hello ${safeName},`,
    '',
    summary,
    ''
  ];

  const followed = digest?.sections?.followedPosts || [];
  if (followed.length > 0) {
    lines.push('--- UPDATES FROM DEVELOPERS YOU FOLLOW ---');
    followed.slice(0, 3).forEach((p) => {
      const author = p.author?.name || p.author?.username || 'Developer';
      const excerpt = (p.content || '').slice(0, 140).replace(/\n/g, ' ');
      const postUrl = sanitizeUrl(`${clientBaseUrl}/post/${p._id}`, clientBaseUrl);
      lines.push(`• ${author}: "${excerpt}"`);
      lines.push(`  Link: ${postUrl}`);
    });
    lines.push('');
  }

  const logs = digest?.sections?.followedBuildLogs || [];
  if (logs.length > 0) {
    lines.push('--- NEW PROJECT BUILD LOGS ---');
    logs.slice(0, 3).forEach((l) => {
      const proj = l.project?.name || 'Project';
      const owner = l.project?.ownerUsername || 'developer';
      const slug = l.project?.slug || '';
      const logUrl = sanitizeUrl(
        `${clientBaseUrl}/projects/${owner}/${slug}/logs/${l._id}`,
        clientBaseUrl
      );
      lines.push(`• [${l.entryType || 'LOG'}] ${l.title} (${proj})`);
      lines.push(`  Link: ${logUrl}`);
    });
    lines.push('');
  }

  const interactions = digest?.sections?.postActivity?.interactions || [];
  if (interactions.length > 0) {
    lines.push('--- ACTIVITY ON YOUR UPDATES ---');
    interactions.slice(0, 3).forEach((i) => {
      const actor = i.actor?.name || i.actor?.username || 'Developer';
      lines.push(`• ${actor} replied to your update: "${(i.postExcerpt || '').slice(0, 80)}"`);
    });
    lines.push('');
  }

  lines.push('='.repeat(40));
  lines.push(`View your full in-app digest: ${digestUrl}`);
  lines.push(`Manage email preferences or Unsubscribe: ${unsubscribeUrl}`);

  return lines.join('\n');
}

/**
 * Sends digest email via Resend if provider is configured and user opted in
 * Handles idempotency, retry boundaries, and ambiguous timeouts safely.
 */
async function sendDigestEmail({
  user,
  digest,
  dateRangeLabel,
  mockResend = null,
  mockTransport = null,
  force = false,
  clientBaseUrl = process.env.CANONICAL_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173'
}) {
  if (!user || !user.email) {
    return {
      success: false,
      status: 'no_recipient',
      message: 'User has no valid email address.'
    };
  }

  // 1. Idempotency Check: if email was already accepted by provider for this digest, do not duplicate (strictly enforced, never bypassed)
  if (digest?.deliveryStatus === 'email_sent') {
    return {
      success: true,
      status: 'email_sent',
      alreadySent: true,
      messageId: digest.emailMessageId || 'already-sent',
      message: 'Weekly digest email was already accepted by Resend for this period.'
    };
  }

  // 2. Ambiguous Timeout Protection: do not blindly retry ambiguous timeouts without explicit force
  if (digest?.isAmbiguousTimeout === true && !force) {
    return {
      success: false,
      status: 'ambiguous_timeout_blocked',
      isAmbiguousTimeout: true,
      message: 'Previous delivery attempt encountered an unconfirmed timeout. Manual retry required to prevent duplicates.'
    };
  }

  // 3. Bounded Retry Check: max 3 attempts
  if (digest?.deliveryAttempts >= 3 && !force) {
    return {
      success: false,
      status: 'max_retries_exceeded',
      attempts: digest.deliveryAttempts,
      message: 'Maximum delivery retry attempts (3) exceeded for this digest period.'
    };
  }

  // 4. Configuration Check
  const config = getEmailConfig();
  // When no test mock is provided and required configuration is missing:
  if (!config.configured && !mockResend && !mockTransport) {
    return {
      success: false,
      status: 'disabled',
      configured: false,
      missing: config.missing,
      message: `Resend email provider is not configured (missing: ${config.missing.join(', ')}). In-app digest remains available.`
    };
  }

  const html = buildDigestEmailHtml({ user, digest, dateRangeLabel, clientBaseUrl });
  const text = buildDigestEmailText({ user, digest, dateRangeLabel, clientBaseUrl });
  const subject = `Postify Weekly Digest — ${dateRangeLabel}`;
  
  // Safe fromAddress formatting without accidental double bracket wrapping
  let fromAddress;
  if (config.fromEmail && config.fromEmail.includes('<') && config.fromEmail.includes('>')) {
    fromAddress = config.fromEmail;
  } else if (config.fromName && config.fromEmail) {
    fromAddress = `${config.fromName} <${config.fromEmail}>`;
  } else {
    fromAddress = config.fromEmail || 'onboarding@resend.dev';
  }

  const deliveryKey =
    digest?.deliveryKey ||
    (digest?._id ? `${digest._id}-${digest.periodKey}` : `temp-${user._id || Date.now()}`);

  // 5. Handle mockTransport (legacy compatibility for existing Phase 10 test suite)
  if (mockTransport && typeof mockTransport.sendMail === 'function') {
    try {
      const res = await mockTransport.sendMail({
        to: user.email,
        from: fromAddress,
        subject,
        html,
        text
      });
      return {
        success: true,
        status: 'email_sent',
        messageId: res.messageId || 'mock-id',
        deliveryKey
      };
    } catch (err) {
      return {
        success: false,
        status: 'email_failed',
        error: err.message,
        isAmbiguousTimeout: false,
        deliveryKey
      };
    }
  }

  // 6. Handle mockResend or real Resend SDK client
  let resendClient;
  if (mockResend) {
    resendClient = mockResend;
  } else {
    resendClient = new Resend(config.apiKey);
  }

  try {
    // Official Resend API:
    // 1st argument (payload): email body + MIME headers ('X-Entity-Ref-ID')
    // 2nd argument (requestOptions): { idempotencyKey } sets the HTTP 'Idempotency-Key' header
    const result = await resendClient.emails.send(
      {
        from: fromAddress,
        to: [user.email],
        subject,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': deliveryKey
        }
      },
      {
        idempotencyKey: deliveryKey
      }
    );

    // Check Resend error object { data, error }
    if (result && result.error) {
      const errMsg = result.error.message || 'Resend API rejected email request.';
      const isAmbiguous = isTimeoutError(result.error);
      return {
        success: false,
        status: 'email_failed',
        error: errMsg,
        isAmbiguousTimeout: isAmbiguous,
        deliveryKey
      };
    }

    if (result && result.data && result.data.id) {
      return {
        success: true,
        status: 'email_sent',
        messageId: result.data.id,
        deliveryKey
      };
    }

    return {
      success: false,
      status: 'email_failed',
      error: 'Invalid response format received from Resend SDK.',
      isAmbiguousTimeout: false,
      deliveryKey
    };
  } catch (err) {
    const isAmbiguous = isTimeoutError(err);
    return {
      success: false,
      status: 'email_failed',
      error: err.message || 'Exception occurred during Resend email dispatch.',
      isAmbiguousTimeout: isAmbiguous,
      deliveryKey
    };
  }
}

module.exports = {
  isEmailConfigured,
  getEmailConfig,
  escapeHtml,
  sanitizeUrl,
  isTimeoutError,
  buildDigestEmailHtml,
  buildDigestEmailText,
  sendDigestEmail
};
