const express = require('express');
const router = express.Router();
const {
  createCollection,
  getCollections,
  getCollectionById,
  updateCollection,
  deleteCollection
} = require('../controllers/collectionController');
const { protect } = require('../middleware/auth');

router.use(protect); // All collection endpoints require verified authentication

router.post('/', createCollection);
router.get('/', getCollections);
router.get('/:id', getCollectionById);
router.patch('/:id', updateCollection);
router.delete('/:id', deleteCollection);

module.exports = router;
