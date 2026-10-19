const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

/**
 * Resolve uploads directory dynamically (supports Render persistent disk mount via UPLOADS_DIR)
 */
const getUploadsDir = () => {
  const dir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '../../../public/images/uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Initial directory check
getUploadsDir();

// Preserve existing diskStorage naming strategy: 12-byte random hex + original extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, getUploadsDir());
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, (err, bytes) => {
      if (err) return cb(err);
      const filename = bytes.toString('hex') + path.extname(file.originalname).toLowerCase();
      cb(null, filename);
    });
  }
});

// Allowed magic byte signatures for real images (JPEG, PNG, WebP, GIF)
const isValidImageBuffer = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38 ('GIF8')
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;

  return false;
};

// File validation: allow images only (jpeg, jpg, png, webp, gif)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedExtensions.test(file.mimetype);

  // Explicitly disallow SVG and executable script extensions
  if (file.originalname.toLowerCase().endsWith('.svg')) {
    return cb(new Error('SVG files are not supported for avatars for security reasons.'), false);
  }

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed.'), false);
  }
};

// 2 MB file size limit
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: fileFilter
});

module.exports = upload;
module.exports.isValidImageBuffer = isValidImageBuffer;
module.exports.getUploadsDir = getUploadsDir;
