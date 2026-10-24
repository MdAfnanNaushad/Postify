/**
 * In-memory API Request & Performance Telemetry
 * Provides accurate operational metrics (traffic volume, error rate, latency distribution)
 * without persisting PII or adding external database overhead.
 */

const MAX_SAMPLES = 2000;
const latencySamples = [];
const hourlyBuckets = new Map();

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  startTime: Date.now(),
  statusCounts: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  routeHits: {}
};

const telemetryMiddleware = (req, res, next) => {
  // Only instrument /api requests
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const startTime = process.hrtime();
  metrics.totalRequests++;

  // Record hourly bucket
  const now = new Date();
  const hourKey = `${now.toISOString().slice(0, 13)}:00`;
  if (!hourlyBuckets.has(hourKey)) {
    // Keep only last 24 hours
    if (hourlyBuckets.size >= 24) {
      const oldestKey = hourlyBuckets.keys().next().value;
      hourlyBuckets.delete(oldestKey);
    }
    hourlyBuckets.set(hourKey, { requests: 0, errors: 0 });
  }
  const currentBucket = hourlyBuckets.get(hourKey);
  currentBucket.requests++;

  // Intercept finish to capture status and latency
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const latencyMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    // Record latency sample
    latencySamples.push(latencyMs);
    if (latencySamples.length > MAX_SAMPLES) {
      latencySamples.shift();
    }

    const statusCode = res.statusCode;
    if (statusCode >= 200 && statusCode < 300) {
      metrics.statusCounts['2xx']++;
    } else if (statusCode >= 300 && statusCode < 400) {
      metrics.statusCounts['3xx']++;
    } else if (statusCode >= 400 && statusCode < 500) {
      metrics.statusCounts['4xx']++;
      metrics.totalErrors++;
      currentBucket.errors++;
    } else if (statusCode >= 500) {
      metrics.statusCounts['5xx']++;
      metrics.totalErrors++;
      currentBucket.errors++;
    }

    // Record route metric (sanitize dynamic IDs)
    const sanitizedPath = req.baseUrl || req.path.replace(/[0-9a-fA-F]{24}/g, ':id');
    metrics.routeHits[sanitizedPath] = (metrics.routeHits[sanitizedPath] || 0) + 1;
  });

  next();
};

const getTelemetryStats = () => {
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const count = sorted.length;

  const avgLatency = count > 0
    ? Math.round((sorted.reduce((sum, val) => sum + val, 0) / count) * 100) / 100
    : 0;
  const p50 = count > 0 ? sorted[Math.floor(count * 0.5)] : 0;
  const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
  const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;

  const errorRate = metrics.totalRequests > 0
    ? Math.round((metrics.totalErrors / metrics.totalRequests) * 10000) / 100
    : 0;

  // Format hourly traffic
  const hourlyTraffic = Array.from(hourlyBuckets.entries()).map(([hour, data]) => ({
    hour,
    requests: data.requests,
    errors: data.errors
  }));

  // Top routes (max 10)
  const topRoutes = Object.entries(metrics.routeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, hits]) => ({ route, hits }));

  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    errorRate,
    statusCounts: metrics.statusCounts,
    latency: {
      avg: avgLatency,
      p50,
      p95,
      p99,
      samplesCount: count
    },
    uptimeSeconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    hourlyTraffic,
    topRoutes
  };
};

module.exports = {
  telemetryMiddleware,
  getTelemetryStats
};
