const ImageKit = require('imagekit');

/**
 * Resolve ImageKit credentials supporting common environment variable aliases
 */
const getImageKitCredentials = () => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || process.env.IMAGE_KIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLICKEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || process.env.IMAGE_KIT_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATEKEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL || process.env.IMAGEKIT_ENDPOINT || process.env.IMAGE_KIT_URL_ENDPOINT;
  return { publicKey, privateKey, urlEndpoint };
};

/**
 * Check if ImageKit configuration is present in environment variables
 */
const isImageKitConfigured = () => {
  const { publicKey, privateKey, urlEndpoint } = getImageKitCredentials();
  return Boolean(
    publicKey &&
    privateKey &&
    urlEndpoint &&
    !publicKey.includes('your_') &&
    !privateKey.includes('your_') &&
    !urlEndpoint.includes('your_')
  );
};

/**
 * Get ImageKit SDK client instance
 */
let imageKitInstance = null;
const getImageKitClient = () => {
  if (!isImageKitConfigured()) {
    return null;
  }
  const { publicKey, privateKey, urlEndpoint } = getImageKitCredentials();
  if (!imageKitInstance) {
    imageKitInstance = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint
    });
  }
  return imageKitInstance;
};

/**
 * Upload an image buffer to ImageKit
 * 
 * @param {Object} options
 * @param {Buffer|string} options.fileBuffer - Buffer or base64 string
 * @param {string} options.fileName - Destination filename
 * @param {string} [options.folder='/postify'] - Remote folder path in ImageKit media library
 * @param {string[]} [options.tags=[]] - Optional tags for organization
 * @returns {Promise<Object>} ImageKit upload response containing url and fileId
 */
const uploadToImageKit = async ({ fileBuffer, fileName, folder = '/postify', tags = [] }) => {
  const client = getImageKitClient();
  if (!client) {
    throw new Error('ImageKit is not configured. Please supply IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.');
  }

  const response = await client.upload({
    file: fileBuffer,
    fileName: fileName,
    folder: folder,
    tags: tags,
    useUniqueFileName: true
  });

  return {
    success: true,
    url: response.url,
    fileId: response.fileId,
    name: response.name,
    thumbnailUrl: response.thumbnailUrl || response.url
  };
};

/**
 * Delete an image from ImageKit by fileId
 * 
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
const deleteFromImageKit = async (fileId) => {
  const client = getImageKitClient();
  if (!client || !fileId) return false;

  try {
    await client.deleteFile(fileId);
    return true;
  } catch (err) {
    console.error('[ImageKit Delete Error]:', err.message);
    return false;
  }
};

module.exports = {
  isImageKitConfigured,
  getImageKitClient,
  uploadToImageKit,
  deleteFromImageKit
};
