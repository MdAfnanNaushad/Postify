const rateLimit = require('express-rate-limit');

/**
 * Distributed deployment notice:
 * The default rate limiters use in-memory MemoryStore, which maintains quotas per Node process instance.
 * For horizontally scaled, multi-instance cluster deployments, configure a centralized store such as
 * Redis (e.g. rate-limit-redis) to share state across instances.
 */

const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

// Flexible key generator that throttles authenticated users by account ID and guests by IP
const userOrIpKeyGenerator = (req) => {
  if (req.user && (req.user._id || req.user.id)) {
    return `user_${req.user._id || req.user.id}`;
  }
  return req.ip || req.headers['x-forwarded-for'] || 'unknown_ip';
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client, please try again after 15 minutes.'
  }
});

// Strict rate limiter for auth routes (brute-force defense)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 5000 : 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  }
});

// Rate limiter for post creation and edits
const createPostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 5000 : 45, // 45 posts/edits per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'You are creating posts too quickly. Please wait a few minutes before trying again.'
  }
});

// Rate limiter for like/unlike operations (anti-spam / abuse defense)
const likeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestOrDev ? 5000 : 60, // 60 likes/unlikes per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many like operations. Please slow down.'
  }
});

// Rate limiter for creating replies
const replyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestOrDev ? 5000 : 30, // 30 replies per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many replies submitted. Please slow down.'
  }
});

// Rate limiter for reposts and quote-posts
const repostLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestOrDev ? 5000 : 30, // 30 repost actions per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many repost actions. Please slow down.'
  }
});

// Rate limiter for follow / unfollow actions
const followLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestOrDev ? 5000 : 40, // 40 follow actions per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many follow actions. Please slow down.'
  }
});

// Rate limiter for search requests
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isTestOrDev ? 5000 : 60, // 60 searches per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many search queries. Please slow down.'
  }
});

// Rate limiter for project and build log creation/updates
const projectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 5000 : 30, // 30 project actions per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many project operations. Please wait a few minutes before trying again.'
  }
});

// Rate limiter for abuse reports
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 5000 : 15, // 15 reports per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many reports submitted. Please wait before reporting additional content.'
  }
});

// Rate limiter for manual digest generation
const digestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTestOrDev ? 5000 : 10, // 10 manual refreshes per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many digest generation requests. Digests update weekly.'
  }
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestOrDev ? 5000 : 20, // 20 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Upload limit reached. Please wait a few minutes before uploading more images.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  createPostLimiter,
  likeLimiter,
  replyLimiter,
  repostLimiter,
  followLimiter,
  searchLimiter,
  projectLimiter,
  reportLimiter,
  digestLimiter,
  uploadLimiter
};
