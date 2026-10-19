const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(`[Error]: ${err.stack || err.message}`);

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(404).json({ success: false, message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    return res.status(400).json({ success: false, message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ success: false, message: message.join(', ') });
  }

  // Multer errors (file size, file type)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size exceeds the 2MB limit.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }

  // Multer custom fileFilter error
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // CORS / CSRF Origin rejection error
  if (err.message && err.message.includes('Blocked by CORS policy')) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Cross-site request forgery protection triggered. Untrusted Origin.'
    });
  }

  const statusCode = error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const responseMessage = (statusCode === 500 && isProduction)
    ? 'Internal server error'
    : (error.message || 'Server Internal Error');

  res.status(statusCode).json({
    success: false,
    message: responseMessage
  });
};

module.exports = errorHandler;
