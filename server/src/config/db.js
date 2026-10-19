const mongoose = require('mongoose');

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      console.error('\x1b[31m%s\x1b[0m', 'FATAL DATABASE ERROR: MONGODB_URI (or MONGO_URI) is required in production mode.');
      console.error('\x1b[31m%s\x1b[0m', 'Postify will not start without a configured production MongoDB connection string. Local fallback is disabled in production.');
      process.exit(1);
    }
    return 'mongodb://127.0.0.1:27017/miniproject';
  }
  return uri;
};

const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  // Redact username:password if present (e.g. mongodb+srv://user:pass@cluster.mongodb.net/...)
  return uri.replace(/\/\/[^@]+@/, '//***:***@');
};

const connectDB = async () => {
  const uri = getMongoUri();
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[MongoDB Connection Error]: ${err.message}`);
    console.error(`[Target Database URI]: ${sanitizeMongoUri(uri)}`);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
module.exports.sanitizeMongoUri = sanitizeMongoUri;

