const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { apiLimiter } = require('./middleware/rateLimiter');
const { mongoSanitize } = require('./middleware/sanitize');
const { getUploadsDir } = require('./middleware/upload');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const replyRoutes = require('./routes/replyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const topicRoutes = require('./routes/topicRoutes');
const searchRoutes = require('./routes/searchRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const projectRoutes = require('./routes/projectRoutes');
const digestRoutes = require('./routes/digestRoutes');
const reportRoutes = require('./routes/reportRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const adminRoutes = require('./routes/admin/adminRoutes');
const { telemetryMiddleware } = require('./middleware/adminTelemetry');

const app = express();

// Trust reverse proxy (Render, Cloudflare, AWS ALB) for correct IP rate-limiting & HTTPS protocol detection
app.set('trust proxy', 1);

// Standard Security Headers (Clickjacking defense, MIME sniffing prevention, Referrer isolation)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS configuration (narrowly restricted to client origin, supporting credentials)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.CANONICAL_APP_URL,
  process.env.RENDER_EXTERNAL_URL,
  'http://127.0.0.1:5173',
  'http://localhost:5000'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        (process.env.RENDER_EXTERNAL_URL && origin === process.env.RENDER_EXTERNAL_URL) ||
        (process.env.CANONICAL_APP_URL && origin === process.env.CANONICAL_APP_URL)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// NoSQL Operator Injection Defense: recursively neutralize $ keys in body, query, and params
app.use(mongoSanitize);

// Explicit Origin / CSRF Defense Middleware for cookie-authenticated state-changing requests
app.use((req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method) && req.path.startsWith('/api/')) {
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
    // Allow requests with matching origin or direct local/testing calls (no origin)
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.RENDER_EXTERNAL_URL && origin === process.env.RENDER_EXTERNAL_URL) ||
      (process.env.CANONICAL_APP_URL && origin === process.env.CANONICAL_APP_URL);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cross-site request forgery protection triggered. Untrusted Origin.'
      });
    }
  }
  next();
});

// Static file serving for uploads with safe caching and MIME protection headers
const activeUploadsPath = getUploadsDir();
const defaultUploadsPath = path.resolve(__dirname, '../../public/images/uploads');
const legacyPublicPath = path.resolve(__dirname, '../../public');

const staticUploadOptions = {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
};

// 1. Primary endpoint: /uploads/filename.ext
app.use('/uploads', express.static(activeUploadsPath, staticUploadOptions));
if (activeUploadsPath !== defaultUploadsPath) {
  app.use('/uploads', express.static(defaultUploadsPath, staticUploadOptions));
}

// 2. Backward compatibility endpoint: /images/uploads/filename.ext
app.use('/images/uploads', express.static(activeUploadsPath, staticUploadOptions));
if (activeUploadsPath !== defaultUploadsPath) {
  app.use('/images/uploads', express.static(defaultUploadsPath, staticUploadOptions));
}

// 3. Fallback generic public
app.use(express.static(legacyPublicPath));

// Apply general API rate limiting to /api/*
app.use('/api', apiLimiter);

// In-memory telemetry instrumentation for API traffic and latency
app.use(telemetryMiddleware);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/replies', replyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);

// Server-side Social Link Previews for Non-JavaScript Crawlers & Social Bots (Phase 2B)
const CRAWLER_USER_AGENT_REGEX =
  /bot|crawl|spider|facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest\/|vkshare|w3c_validator/i;

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

app.get('/post/:id', async (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = CRAWLER_USER_AGENT_REGEX.test(userAgent);
  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const Post = require('./models/post');
    const post = await Post.findById(req.params.id).populate('user', 'username name Profilepic');

    if (!post) {
      if (isCrawler) {
        return res
          .status(404)
          .send('<!DOCTYPE html><html><head><title>Post Not Found - Postify</title></head><body><h1>Post Not Found</h1></body></html>');
      }
      return res.redirect(`${clientBaseUrl}/post/${req.params.id}`);
    }

    const cleanDescription = (post.content || '')
      .replace(/[#*`_~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const authorName = post.user?.name || post.user?.username || 'Postify Author';
    const postUrl = `${clientBaseUrl}/post/${post._id}`;
    const avatarUrl = post.user?.Profilepic
      ? (post.user.Profilepic.startsWith('http://') || post.user.Profilepic.startsWith('https://')
          ? post.user.Profilepic
          : `${clientBaseUrl}/uploads/${post.user.Profilepic}`)
      : `${clientBaseUrl}/uploads/Profilepic.jpg`;

    if (isCrawler) {
      const safeAuthor = escapeHtml(authorName);
      const safeDesc = escapeHtml(cleanDescription);
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeAuthor} on Postify: "${safeDesc.slice(0, 50)}..."</title>
  <meta name="description" content="${safeDesc}">
  <link rel="canonical" href="${postUrl}">
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${safeAuthor} on Postify">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:image" content="${avatarUrl}">
  <meta property="og:site_name" content="Postify">
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeAuthor} on Postify">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${avatarUrl}">
</head>
<body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto;">
  <h1>${safeAuthor} on Postify</h1>
  <p>${safeDesc}</p>
  <p><a href="${postUrl}">Read full story on Postify</a></p>
</body>
</html>`);
    }

    // If deployed on same origin with built client, serve SPA directly; otherwise redirect to external client URL
    const clientDistIndex = path.resolve(__dirname, '../../client/dist/index.html');
    const reqHost = req.get('host');
    const isSameOrigin = Boolean(reqHost && (clientBaseUrl.includes(reqHost) || clientBaseUrl === `${req.protocol}://${reqHost}`));

    if (isSameOrigin && fs.existsSync(clientDistIndex)) {
      return res.sendFile(clientDistIndex);
    }
    res.redirect(`${clientBaseUrl}/post/${post._id}`);
  } catch (err) {
    next(err);
  }
});

// Server-side Social Link Previews for Projects (Phase 9 & Phase 10 Audit)
const handleProjectPreview = async (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = CRAWLER_USER_AGENT_REGEX.test(userAgent);
  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const Project = require('./models/project');
    const User = require('./models/user');
    const { idOrSlug, username, slug } = req.params;
    let query;

    if (username && slug) {
      const ownerUser = await User.findOne({ username: username.toLowerCase() });
      if (!ownerUser) {
        if (isCrawler) {
          return res
            .status(404)
            .send('<!DOCTYPE html><html><head><title>Project Not Found - Postify</title></head><body><h1>Project Not Found</h1></body></html>');
        }
        return res.redirect(`${clientBaseUrl}/projects`);
      }
      query = { owner: ownerUser._id, slug: slug.toLowerCase() };
    } else if (mongoose.isValidObjectId(idOrSlug)) {
      query = { _id: idOrSlug };
    } else {
      query = { slug: idOrSlug.toLowerCase() };
    }

    const project = await Project.findOne(query).populate('owner', 'username name Profilepic');

    if (!project || project.visibility === 'private') {
      if (isCrawler) {
        return res
          .status(404)
          .send('<!DOCTYPE html><html><head><title>Project Not Found - Postify</title></head><body><h1>Project Not Found</h1></body></html>');
      }
      return res.redirect(`${clientBaseUrl}/projects`);
    }

    const cleanDescription = (project.shortDescription || project.description || '')
      .replace(/[#*`_~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    const ownerName = project.owner?.name || project.owner?.username || 'Postify Developer';
    const ownerUsername = project.owner?.username || 'developer';
    const projectUrl = `${clientBaseUrl}/projects/${ownerUsername}/${project.slug}`;
    const avatarUrl = project.owner?.Profilepic
      ? (project.owner.Profilepic.startsWith('http://') || project.owner.Profilepic.startsWith('https://')
          ? project.owner.Profilepic
          : `${clientBaseUrl}/uploads/${project.owner.Profilepic}`)
      : `${clientBaseUrl}/uploads/Profilepic.jpg`;

    if (isCrawler) {
      const safeTitle = escapeHtml(project.name);
      const safeOwner = escapeHtml(ownerName);
      const safeDesc = escapeHtml(cleanDescription);
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle} by ${safeOwner} — Postify Project Journal</title>
  <meta name="description" content="${safeDesc}">
  <link rel="canonical" href="${projectUrl}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${safeTitle} — Postify">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${projectUrl}">
  <meta property="og:image" content="${avatarUrl}">
  <meta property="og:site_name" content="Postify">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle} — Postify">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${avatarUrl}">
</head>
<body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: auto;">
  <h1>${safeTitle}</h1>
  <p>by ${safeOwner}</p>
  <p>${safeDesc}</p>
  <p><a href="${projectUrl}">View Project & Build Logs on Postify</a></p>
</body>
</html>`);
    }

    const clientDistIndex = path.resolve(__dirname, '../../client/dist/index.html');
    const reqHost = req.get('host');
    const isSameOrigin = Boolean(reqHost && (clientBaseUrl.includes(reqHost) || clientBaseUrl === `${req.protocol}://${reqHost}`));

    if (isSameOrigin && fs.existsSync(clientDistIndex)) {
      return res.sendFile(clientDistIndex);
    }
    res.redirect(projectUrl);
  } catch (err) {
    next(err);
  }
};

app.get('/projects/:username/:slug', handleProjectPreview);
app.get('/projects/:idOrSlug', handleProjectPreview);

// Health check endpoints (suitable for Render health checks and uptime monitoring)
app.get(['/health', '/api/health'], (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'Postify',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Explicit API 404 handler: prevents unknown /api/* requests from returning the SPA HTML shell
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Production SPA Static Assets and Catch-all Route
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  // Serve static assets from Vite build
  app.use(
    express.static(clientDistPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );

  // SPA fallback for all remaining non-API GET requests
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized error handling
app.use(errorHandler);

module.exports = app;
